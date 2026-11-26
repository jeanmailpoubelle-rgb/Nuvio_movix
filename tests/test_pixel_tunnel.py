"""Trial connector: preserve keys, pin identities, bound retry and keep URL tokens local."""
import hashlib
import os
from pathlib import Path
import signal
import subprocess
import tempfile
import time
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'scripts/pixel/ngrok-tunnel.sh'

class PixelTunnelTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)
        self.state = self.folder / 'state'
        self.bin = self.folder / 'bin'
        self.bin.mkdir()
        self.env = {**os.environ, 'NUVIO_TUNNEL_DIR': str(self.state), 'PATH': str(self.bin) + os.pathsep + os.environ['PATH']}

    def run_script(self, *args, text=''):
        return subprocess.run(['bash', str(SCRIPT), *args], input=text, text=True, capture_output=True, env=self.env, timeout=10)

    def stub(self, name, body):
        p = self.bin / name
        p.write_text('#!/usr/bin/env bash\n' + body + '\n')
        p.chmod(0o700)

    def test_host_key_verification_uses_real_crypto_and_rejects_any_other_key(self):
        key = self.folder / 'key'
        subprocess.run(['ssh-keygen', '-q', '-t', 'ed25519', '-N', '', '-f', str(key)], check=True)
        expected = subprocess.check_output(['ssh-keygen', '-lf', str(key)+'.pub', '-E', 'sha256'], text=True).split()[1]
        for pin, code in [(expected, 0), ('SHA256:wrong', 1)]:
            r = subprocess.run(['bash', '-c', 'source "$1"; verify_host_key "$2" "$3"', 'test', str(SCRIPT), str(key)+'.pub', pin], capture_output=True, env=self.env)
            self.assertEqual(r.returncode, code)

    def test_setup_rejects_untrusted_host_without_overwriting_private_key_or_trusted_hosts(self):
        fake = self.folder / 'fake'
        subprocess.run(['ssh-keygen', '-q', '-t', 'ed25519', '-N', '', '-f', str(fake)], check=True)
        self.stub('ssh-keyscan', 'cat '+str(fake)+'.pub')
        r = self.run_script('setup')
        self.assertNotEqual(r.returncode, 0)
        self.assertIn('fingerprint differs', r.stderr)
        key = self.state / 'id_ed25519'
        before = hashlib.sha256(key.read_bytes()).hexdigest()
        (self.state / 'known_hosts').write_text('PREVIOUS_TRUSTED_KEY')
        self.run_script('setup')
        self.assertEqual(hashlib.sha256(key.read_bytes()).hexdigest(), before)
        self.assertEqual((self.state / 'known_hosts').read_text(), 'PREVIOUS_TRUSTED_KEY')
        self.assertFalse((self.state / 'known_hosts.next').exists())
        self.assertEqual(key.stat().st_mode & 0o777, 0o600)
        self.assertNotIn('PRIVATE KEY', r.stdout + r.stderr)

    def test_private_url_preserves_token_and_is_not_saved(self):
        token = 'ab' * 16
        for host in ['127.0.0.1', '192.168.1.5', '10.0.0.2', '172.16.0.3']:
            r = self.run_script('url', 'pixel-example.ngrok-free.app', text=f'http://{host}:8765/{token}/manifest.json\n')
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertIn(f'https://pixel-example.ngrok-free.app/{token}/manifest.json', r.stdout)
        self.assertFalse(self.state.exists())
        for value in ['https://public.example/'+token+'/manifest.json', 'http://127.0.0.1:8765/'+token+'/config']:
            self.assertNotEqual(self.run_script('url', 'pixel-example.ngrok-free.app', text=value+'\n').returncode, 0)

    def test_invalid_domain_cannot_become_an_ssh_option_or_forward_target(self):
        for domain in ['--help', 'https://x.ngrok-free.app', 'x.ngrok-free.app/token', 'x..ngrok-free.app', 'x.ngrok-free.app:22', 'x.ngrok-free.app\nother', 'x.ngrok-free.app.']:
            r = self.run_script('start', domain)
            self.assertNotEqual(r.returncode, 0)
            self.assertFalse((self.state / 'domain').exists())

    def setup_mock_connection(self):
        self.state.mkdir()
        (self.state / 'id_ed25519').write_text('PRIVATE_TEST_KEY')
        (self.state / 'known_hosts').write_text('TEST_HOST_KEY')
        self.args_file = self.folder / 'args'
        self.env['NUVIO_TEST_ARGS'] = str(self.args_file)
        self.stub('sleep', 'exit 0')

    def test_retry_is_bounded_and_forwarding_is_only_to_token_protected_loopback_host(self):
        self.setup_mock_connection()
        self.stub('ssh', 'printf "%s\\n" "$@" >> "$NUVIO_TEST_ARGS"\nprintf "CALL\\n" >> "$NUVIO_TEST_ARGS"\nexit 255')
        # Mock only remote pin availability; the crypto verifier is tested above.
        r = subprocess.run(['bash', '-c', 'source "$1"; verify_host_key(){ return 0; }; run_tunnel pixel-example.ngrok-free.app', 'test', str(SCRIPT)], text=True, capture_output=True, env=self.env, timeout=10)
        self.assertNotEqual(r.returncode, 0)
        args = self.args_file.read_text()
        self.assertEqual(args.count('CALL\n'), 6)
        self.assertEqual(args.count('pixel-example.ngrok-free.app:443:127.0.0.1:8765'), 6)
        self.assertIn('StrictHostKeyChecking=yes', args)
        self.assertIn('ExitOnForwardFailure=yes', args)
        self.assertNotIn('PRIVATE_TEST_KEY', args + r.stdout + r.stderr)
        self.assertFalse((self.state / 'running').exists())
        self.assertEqual((self.state / 'domain').read_text().strip(), 'pixel-example.ngrok-free.app')

    def test_explicit_stop_cleans_up_forwarder_and_does_not_rotate_saved_domain(self):
        self.setup_mock_connection()
        self.env['NUVIO_TEST_PID'] = str(self.folder / 'pid')
        self.stub('ssh', 'echo $$ > "$NUVIO_TEST_PID"\nexec /bin/sleep 60')
        p = subprocess.Popen(['bash', '-c', 'source "$1"; verify_host_key(){ return 0; }; run_tunnel pixel-example.ngrok-free.app', 'test', str(SCRIPT)], stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=self.env)
        self.addCleanup(lambda: p.poll() is None and p.kill())
        deadline = time.monotonic() + 3
        while not (self.folder / 'pid').exists() and time.monotonic() < deadline:
            time.sleep(.02)
        self.assertTrue((self.folder / 'pid').exists())
        child = int((self.folder / 'pid').read_text())
        p.send_signal(signal.SIGTERM)
        p.communicate(timeout=3)
        with self.assertRaises(ProcessLookupError):
            os.kill(child, 0)
        self.assertFalse((self.state / 'running').exists())
        self.assertEqual((self.state / 'domain').read_text().strip(), 'pixel-example.ngrok-free.app')
