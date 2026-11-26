#!/usr/bin/env bash
# Supervised Pixel/Termux trial: official ngrok SSH reverse tunnel, no video proxy.
set -euo pipefail
umask 077
NGROK_HOST=connect.eu.ngrok-agent.com
NGROK_FINGERPRINT='SHA256:OeywYk1/2w9cOg8Q3FjbsMOe2Hc9CvxbyBhDdUBBOlQ'
STATE_DIR=${NUVIO_TUNNEL_DIR:-${HOME:?}/.local/share/nuvio-ngrok}
CHILD=''
LOCKED=false
fail() { printf '%s\n' "$*" >&2; return 1; }
need() { command -v "$1" >/dev/null || fail "Missing $1. In Termux run: pkg install openssh"; }
state_directory() {
    [[ ! -L "$STATE_DIR" ]] || fail 'State directory must not be a symbolic link.'
    mkdir -p -- "$STATE_DIR"
    chmod 700 -- "$STATE_DIR"
}
valid_domain() {
    local value=$1 label
    [[ ${#value} -le 253 && "$value" != *..* && "$value" == *.* && "$value" =~ ^[a-z0-9.-]+$ ]] || return 1
    local -a labels
    IFS=. read -r -a labels <<< "$value"
    for label in "${labels[@]}"; do
        [[ ${#label} -ge 1 && ${#label} -le 63 && "$label" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$ ]] || return 1
    done
    [[ "$value" != *. ]]
}
verify_host_key() {
    local file=$1 expected=$2 fingerprint found=false
    local fingerprints
    fingerprints=$(ssh-keygen -lf "$file" -E sha256 2>/dev/null) || return 1
    while read -r _ fingerprint _; do
        [[ "$fingerprint" == "$expected" ]] || return 1
        found=true
    done <<< "$fingerprints"
    [[ "$found" == true ]]
}
prepare() {
    need ssh; need ssh-keygen; need ssh-keyscan
    state_directory
    if [[ ! -e "$STATE_DIR/id_ed25519" ]]; then
        [[ ! -e "$STATE_DIR/id_ed25519.pub" ]] || fail 'Public key exists without its private key. Restore the pair; do not overwrite it.'
        ssh-keygen -q -t ed25519 -N '' -C 'Nuvio Pixel tunnel' -f "$STATE_DIR/id_ed25519"
    fi
    [[ -f "$STATE_DIR/id_ed25519" && ! -L "$STATE_DIR/id_ed25519" ]] || fail 'Invalid private-key file.'
    chmod 600 -- "$STATE_DIR/id_ed25519"
    # Derive the public half again; never replace an existing private key.
    ssh-keygen -y -P '' -f "$STATE_DIR/id_ed25519" > "$STATE_DIR/public.next"
    mv -- "$STATE_DIR/public.next" "$STATE_DIR/id_ed25519.pub"
    printf 'Checking ngrok SSH server identity…\n'
    local scan
    scan=$(ssh-keyscan -T 10 -t rsa "$NGROK_HOST" 2>/dev/null) || fail 'Cannot reach ngrok SSH. Check internet access; setup can be retried without changing your key.'
    printf '%s\n' "$scan" > "$STATE_DIR/known_hosts.next"
    if ! verify_host_key "$STATE_DIR/known_hosts.next" "$NGROK_FINGERPRINT"; then
        rm -f -- "$STATE_DIR/known_hosts.next"
        fail 'ngrok host fingerprint differs from its published EU key. Stop and recheck the official ngrok documentation.'
        return 1
    fi
    mv -- "$STATE_DIR/known_hosts.next" "$STATE_DIR/known_hosts"
    printf 'Add the following PUBLIC key to https://dashboard.ngrok.com/ssh-keys\n'
    cat -- "$STATE_DIR/id_ed25519.pub"
    printf '\nKeep the private key on this Pixel. No ngrok authtoken is needed for SSH.\n'
}
saved_domain() {
    local domain=${1:-}
    if [[ -z "$domain" && -f "$STATE_DIR/domain" ]]; then domain=$(cat -- "$STATE_DIR/domain"); fi
    valid_domain "$domain" || { fail 'Supply only the assigned ngrok hostname, without https://, port, slash or addon token.'; return 1; }
    printf '%s' "$domain"
}
cleanup() {
    if [[ -n "$CHILD" ]]; then kill "$CHILD" 2>/dev/null || true; wait "$CHILD" 2>/dev/null || true; fi
    if [[ "$LOCKED" == true ]]; then rmdir -- "$STATE_DIR/running" 2>/dev/null || true; fi
}
run_tunnel() {
    need ssh; need ssh-keygen
    state_directory
    local domain
    domain=$(saved_domain "${1:-}")
    [[ -f "$STATE_DIR/id_ed25519" && -f "$STATE_DIR/known_hosts" ]] || { fail 'Run setup first, then register the public key with ngrok.'; return 1; }
    verify_host_key "$STATE_DIR/known_hosts" "$NGROK_FINGERPRINT" || { fail 'Saved ngrok host identity is invalid. Run setup again.'; return 1; }
    mkdir -- "$STATE_DIR/running" 2>/dev/null || { fail 'A tunnel may already be running. Stop that Termux session first. After a phone reboot, remove the stale running directory only if no tunnel remains.'; return 1; }
    LOCKED=true
    trap cleanup EXIT
    trap 'exit 130' INT
    trap 'exit 143' TERM
    printf '%s\n' "$domain" > "$STATE_DIR/domain.next"
    mv -- "$STATE_DIR/domain.next" "$STATE_DIR/domain"
    printf 'Connecting https://%s to Anime-Sama Host on this Pixel.\n' "$domain"
    printf 'Leave this Termux session running. Ctrl+C stops remote access; the local host stays running.\n'
    local attempt=0 delay=2 started status duration
    while (( attempt < 6 )); do
        started=$SECONDS
        # Do not display/store remote request logs: paths can contain addon keys.
        ssh -T -o BatchMode=yes -o IdentitiesOnly=yes -o ExitOnForwardFailure=yes \
            -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$STATE_DIR/known_hosts" \
            -o HostKeyAlgorithms=rsa-sha2-512,rsa-sha2-256 \
            -o ConnectTimeout=15 -o ServerAliveInterval=30 -o ServerAliveCountMax=3 \
            -i "$STATE_DIR/id_ed25519" -R "$domain:443:127.0.0.1:8765" \
            "v2@$NGROK_HOST" http >/dev/null 2>&1 &
        CHILD=$!
        if wait "$CHILD"; then status=0; else status=$?; fi
        CHILD=''
        duration=$((SECONDS-started))
        if (( duration >= 60 )); then attempt=0; delay=2; fi
        attempt=$((attempt+1))
        (( attempt < 6 )) || break
        printf 'Tunnel closed (SSH status %s). Retry %s/6 in %ss.\n' "$status" "$attempt" "$delay"
        sleep "$delay" & CHILD=$!
        wait "$CHILD" || true
        CHILD=''
        delay=$((delay*2)); (( delay <= 60 )) || delay=60
    done
    fail 'Tunnel stopped after repeated failures. Check the registered public key, assigned domain, network and ngrok account limits. Local addon access is unchanged.'
}
print_url() {
    local domain local_url token
    domain=$(saved_domain "${1:-}")
    printf 'Paste the existing local/home-network addon manifest URL (kept only in memory):\n' >&2
    IFS= read -r local_url
    if [[ "$local_url" =~ ^http://(127\.0\.0\.1|10\.[0-9]+\.[0-9]+\.[0-9]+|192\.168\.[0-9]+\.[0-9]+|172\.(1[6-9]|2[0-9]|3[01])\.[0-9]+\.[0-9]+):8765/([a-f0-9]{32})/manifest\.json$ ]]; then
        token=${BASH_REMATCH[3]}
        printf 'Private addon URL — paste only into Nuvio:\nhttps://%s/%s/manifest.json\n' "$domain" "$token"
    else
        fail 'Expected the private manifest URL copied from Anime-Sama Host, with port 8765.'
    fi
}
main() {
    case ${1:-help} in
        setup) prepare ;;
        start) run_tunnel "${2:-}" ;;
        url) print_url "${2:-}" ;;
        *) printf 'Usage: bash ngrok-tunnel.sh setup | start [assigned-hostname] | url [assigned-hostname]\n' ;;
    esac
}
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then main "$@"; fi
