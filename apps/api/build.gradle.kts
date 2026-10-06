plugins {
	java
	id("org.springframework.boot") version "4.1.1"
	id("io.spring.dependency-management") version "1.1.7"
}

group = "com.omnidoc"
version = "0.0.1-SNAPSHOT"
description = "OmniDoc JVM API (ADR-0005)"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(21)
	}
}

repositories {
	mavenCentral()
}

configurations {
	all {
		exclude(group = "org.springframework.boot", module = "spring-boot-starter-logging")
	}
}

dependencies {
	implementation("org.springframework.boot:spring-boot-starter-actuator")
	implementation("org.springframework.boot:spring-boot-starter-security")
	implementation("org.springframework.boot:spring-boot-starter-webmvc")
	implementation("org.springframework.boot:spring-boot-starter-log4j2")
	implementation("org.springframework.boot:spring-boot-starter-data-jdbc")
	implementation("org.springframework.boot:spring-boot-starter-flyway")
	implementation("org.flywaydb:flyway-database-postgresql")
	implementation("org.postgresql:postgresql")
	implementation("com.pgvector:pgvector:0.1.6")

	// B-05b import parsers (architecture.md §5.2.1 §6). Narrow Tika modules only —
	// tika-parsers-standard-package pulls formats outside the allowlist.
	// No Spring AI ETL (no TikaDocumentReader / TokenTextSplitter): §7.
	implementation("org.apache.tika:tika-core:4.1.0")
	implementation("org.apache.tika:tika-parser-pdf-module:4.1.0")
	implementation("org.apache.tika:tika-parser-microsoft-module:4.1.0")
	implementation("org.apache.tika:tika-parser-html-module:4.1.0")
	implementation("org.apache.tika:tika-parser-text-module:4.1.0")
	implementation("org.commonmark:commonmark:0.30.0")
	implementation("org.commonmark:commonmark-ext-gfm-tables:0.30.0")

	testImplementation("org.springframework.boot:spring-boot-starter-actuator-test")
	testImplementation("org.springframework.boot:spring-boot-starter-security-test")
	testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
	testImplementation("com.tngtech.archunit:archunit-junit5:1.4.1")
	testImplementation("org.testcontainers:testcontainers-junit-jupiter:2.0.5")
	testImplementation("org.testcontainers:testcontainers-postgresql:2.0.5")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
	useJUnitPlatform()
}

// Free Tier RSS awareness (I-03 owns SKU PoC). Override via JAVA_TOOL_OPTIONS.
tasks.named<org.springframework.boot.gradle.tasks.run.BootRun>("bootRun") {
	jvmArgs("-Xmx256m")
}
