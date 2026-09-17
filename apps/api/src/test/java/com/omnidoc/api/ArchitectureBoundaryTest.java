package com.omnidoc.api;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/**
 * Hexagonal intent (ADR-0005): Spring AI must not appear on the HTTP wire / web packages.
 * Deliberate violation was introduced then reverted during S-01b verification.
 */
@AnalyzeClasses(
	packages = "com.omnidoc.api",
	importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureBoundaryTest {

	@ArchTest
	static final ArchRule webMustNotDependOnSpringAi = noClasses()
		.that().resideInAPackage("com.omnidoc.api.web..")
		.should().dependOnClassesThat().resideInAPackage("org.springframework.ai..")
		.because("Spring AI belongs in adapters only — never on HTTP DTOs / web packages (ADR-0005)");

	@ArchTest
	static final ArchRule domainMustRemainFrameworkNeutral = noClasses()
		.that().resideInAnyPackage("com.omnidoc.api.domain..", "com.omnidoc.api.application.port..")
		.should().dependOnClassesThat().resideInAnyPackage(
			"com.omnidoc.api.web..",
			"com.omnidoc.api.adapters..",
			"org.springframework..",
			"reactor..",
			"org.reactivestreams..")
		.because("domain types and ports are provider-neutral Java contracts");

}
