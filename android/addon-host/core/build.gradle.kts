plugins { kotlin("jvm") }
kotlin { jvmToolchain(21); compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }
java { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
dependencies {
    implementation("io.github.dokar3:quickjs-kt-jvm:1.0.18")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.github.mwiede:jsch:2.28.8")
    testImplementation("org.apache.sshd:sshd-core:2.16.0")
    compileOnly("org.json:json:20240303")
    testImplementation("org.json:json:20240303")
    testImplementation(kotlin("test-junit"))
    testImplementation("com.squareup.okhttp3:mockwebserver:4.12.0")
    testImplementation("com.squareup.okhttp3:okhttp-tls:4.12.0")
}
// On Android the application supplies the Android QuickJS variant instead.
configurations.named("runtimeElements") { exclude(group = "io.github.dokar3", module = "quickjs-kt-jvm") }

tasks.register<JavaExec>("liveCheck") {
    dependsOn(tasks.testClasses)
    classpath = sourceSets.test.get().runtimeClasspath
    mainClass.set("local.animesama.host.ProbeKt")
    args(providers.gradleProperty("probeId").getOrElse("46298"), providers.gradleProperty("probeSeason").getOrElse("1"), providers.gradleProperty("probeEpisode").getOrElse("1"), providers.gradleProperty("probeRepeat").getOrElse("1"))
    // Optional development truststore; no private manifest or provider credentials.
    listOf("javax.net.ssl.trustStore", "javax.net.ssl.trustStorePassword").forEach { name -> System.getProperty(name)?.let { systemProperty(name, it) } }
}
