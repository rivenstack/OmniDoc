package com.omnidoc.api;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/**
 * Hexagonal intent (ADR-0005): Spring AI must not appear on the HTTP wire / web packages.
 * Deliberate violation was introduced then reverted during S-01b verification.
 *
 * <p>B-05b adds the ingestion boundaries from architecture.md §5.2.1 §7: Spring AI ETL is
 * not permitted anywhere in ingestion, and Tika / commonmark stay inside the one parser
 * adapter package.
 */
@AnalyzeClasses(
	packages = "com.omnidoc.api",
	importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureBoundaryTest {

	private static final String PARSER_PACKAGE = "com.omnidoc.api.adapters.ingestion.parser..";

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

	@ArchTest
	static final ArchRule ingestionMustNotUseSpringAi = noClasses()
		.that().resideInAnyPackage(
			"com.omnidoc.api.adapters.ingestion..",
			"com.omnidoc.api.projection..",
			"com.omnidoc.api.chunking..",
			"com.omnidoc.api.web.ingestion..")
		.should().dependOnClassesThat().resideInAPackage("org.springframework.ai..")
		.because("Spring AI ETL (TikaDocumentReader / TokenTextSplitter) is not permitted in B-05 "
			+ "(architecture.md §5.2.1 §7)");

	@ArchTest
	static final ArchRule parserLibrariesStayInTheParserAdapter = noClasses()
		.that().resideOutsideOfPackage(PARSER_PACKAGE)
		.should().dependOnClassesThat().resideInAnyPackage("org.apache.tika..", "org.commonmark..")
		.because("Tika and commonmark live behind the one parser adapter — never on HTTP DTOs, in the "
			+ "domain, or in the rest of the adapters (architecture.md §5.2.1 §7)");

	@ArchTest
	static final ArchRule projectionAndChunkingStayFrameworkNeutral = noClasses()
		.that().resideInAnyPackage("com.omnidoc.api.projection..", "com.omnidoc.api.chunking..")
		.should().dependOnClassesThat().resideInAnyPackage(
			"com.omnidoc.api.web..",
			"com.omnidoc.api.adapters..",
			"org.springframework..")
		.because("pm-md-v1 and omni-blockpack-v1 are pure deterministic logic: they must be callable "
			+ "from a test or a future re-index job without a Spring context");

	@ArchTest
	static final ArchRule notesMustNotDependOnIngestion = noClasses()
		.that().resideInAPackage("com.omnidoc.api.adapters.notes..")
		.should().dependOnClassesThat().resideInAPackage("com.omnidoc.api.adapters.ingestion..")
		.because("the note-save hook is declared by notes (RechunkOutbox) and implemented by "
			+ "ingestion, so the dependency only ever points one way");

}
