plugins { id("com.android.application") }
android {
    namespace = "local.animesama.host"
    compileSdk { version = release(37) }
    defaultConfig { applicationId = "local.animesama.host"; minSdk = 26; targetSdk = 35; versionCode = 3; versionName = "0.1.2" }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17; isCoreLibraryDesugaringEnabled = true }

}
kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }
dependencies {
    implementation(project(":core")) { exclude(group = "io.github.dokar3", module = "quickjs-kt-jvm") }
    implementation("io.github.dokar3:quickjs-kt-android:1.0.18")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.5")
}
abstract class SyncEngine : DefaultTask() {
    @get:InputFile abstract val engineFile: RegularFileProperty
    @get:OutputDirectory abstract val outputDirectory: DirectoryProperty
    @TaskAction fun copyEngine() {
        val dir = outputDirectory.get().asFile.apply { mkdirs() }
        engineFile.get().asFile.copyTo(dir.resolve("anime-sama.js"), overwrite = true)
    }
}
val syncEngine = tasks.register<SyncEngine>("syncEngine") {
    engineFile.set(layout.projectDirectory.file("../../../plugins/anime-sama/providers/anime-sama.js"))
    outputDirectory.set(layout.buildDirectory.dir("generated/engineAssets"))
}
androidComponents.onVariants { variant ->
    variant.sources.assets?.addGeneratedSourceDirectory(syncEngine, SyncEngine::outputDirectory)
}
