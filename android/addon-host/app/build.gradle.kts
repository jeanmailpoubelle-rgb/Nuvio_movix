plugins { id("com.android.application") }
android {
    namespace = "local.animesama.host"
    compileSdk { version = release(37) }
    defaultConfig { applicationId = "local.animesama.host"; minSdk = 26; targetSdk = 35; versionCode = 9; versionName = "0.3.0"; testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner" }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17; isCoreLibraryDesugaringEnabled = true }

}
kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }
dependencies {
    implementation(project(":core")) { exclude(group = "io.github.dokar3", module = "quickjs-kt-jvm") }
    implementation("io.github.dokar3:quickjs-kt-android:1.0.18")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    androidTestImplementation("androidx.test:runner:1.6.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.5")
}
abstract class SyncEngine : DefaultTask() {
    @get:Internal abstract val repository: DirectoryProperty
    @get:InputFiles val engineInputs get() = project.files(repository.file("hosted-engines/bundled.json"), repository.file("hosted-engines/release-public.pem"), project.fileTree(repository.dir("plugins")) { include("**/providers/*.js") })
    @get:OutputDirectory abstract val outputDirectory: DirectoryProperty
    @TaskAction fun copyEngine() {
        val root = repository.get().asFile
        val dir = outputDirectory.get().asFile.apply { deleteRecursively(); mkdirs() }
        val manifest = groovy.json.JsonSlurper().parse(root.resolve("hosted-engines/bundled.json")) as Map<*, *>
        val files = manifest["files"] as Map<*, *>
        for ((name, spec) in files) {
            val file = root.resolve((spec as Map<*, *>)["path"] as String)
            file.copyTo(dir.resolve(name as String), overwrite = true)
        }
        root.resolve("hosted-engines/bundled.json").copyTo(dir.resolve("engine-package.json"))
        root.resolve("hosted-engines/release-public.pem").copyTo(dir.resolve("release-public.pem"))
        // Compatibility for existing standalone core probes.
        root.resolve("plugins/anime-sama-plus/providers/anime-sama.js").copyTo(dir.resolve("anime-sama.js"))
    }
}
val syncEngine = tasks.register<SyncEngine>("syncEngine") {
    repository.set(layout.projectDirectory.dir("../../.."))
    outputDirectory.set(layout.buildDirectory.dir("generated/engineAssets"))
}
androidComponents.onVariants { variant ->
    variant.sources.assets?.addGeneratedSourceDirectory(syncEngine, SyncEngine::outputDirectory)
}
