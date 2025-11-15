import { NeurologicalCondition, ReportCustomization, GeneratedReport, FindingVariant } from './types';

/**
 * Utility functions for generating MRI reports
 */

export function generateTechniqueSection(condition: NeurologicalCondition): string {
  const required = condition.recommendedSequences.filter(s => s.required);
  const optional = condition.recommendedSequences.filter(s => !s.required);

  let technique = 'MRI of the ' + (condition.category === 'Brain' ? 'brain' : 'spine') + ' was performed.\n\n';
  technique += 'Sequences obtained:\n';

  required.forEach(seq => {
    technique += `- ${seq.name} (${seq.abbreviation})\n`;
  });

  if (optional.length > 0) {
    technique += '\nAdditional sequences:\n';
    optional.forEach(seq => {
      technique += `- ${seq.name} (${seq.abbreviation})\n`;
    });
  }

  return technique.trim();
}

export function generateFindingsSection(
  condition: NeurologicalCondition,
  customization: ReportCustomization
): string {
  let findings = '';

  // Apply variant modifications if selected
  let primaryFindings = [...condition.finding.primaryFindings];
  let secondaryFindings = [...condition.finding.secondaryFindings];
  let signalChars = [...condition.finding.signalCharacteristics];

  if (customization.selectedVariants.length > 0) {
    customization.selectedVariants.forEach(variantId => {
      const variant = condition.variants?.find(v => v.id === variantId);
      if (variant?.modifications) {
        if (variant.modifications.primaryFindings) {
          primaryFindings = variant.modifications.primaryFindings;
        }
        if (variant.modifications.secondaryFindings) {
          secondaryFindings = [...secondaryFindings, ...(variant.modifications.secondaryFindings || [])];
        }
        if (variant.modifications.signalCharacteristics) {
          signalChars = [...signalChars, ...variant.modifications.signalCharacteristics];
        }
      }
    });
  }

  // Location
  findings += 'LOCATION:\n';
  if (customization.selectedLocation) {
    findings += `${customization.selectedLocation}\n`;
  } else {
    findings += `${condition.finding.location.join(', ')}\n`;
  }
  findings += '\n';

  // Primary Findings
  findings += 'PRIMARY FINDINGS:\n';
  primaryFindings.forEach(finding => {
    findings += `- ${finding}\n`;
  });
  findings += '\n';

  // Signal Characteristics
  findings += 'SIGNAL CHARACTERISTICS:\n';
  signalChars.forEach(char => {
    findings += `- ${char.sequence}: ${char.intensity}${char.pattern ? ` (${char.pattern})` : ''}\n`;
  });
  findings += '\n';

  // Enhancement
  if (condition.finding.enhancement) {
    findings += 'CONTRAST ENHANCEMENT:\n';
    findings += `${condition.finding.enhancement}\n\n`;
  }

  // Mass Effect
  if (condition.finding.massEffect) {
    findings += 'MASS EFFECT:\n';
    findings += `${condition.finding.massEffect}\n\n`;
  }

  // Secondary Findings
  if (secondaryFindings.length > 0) {
    findings += 'SECONDARY FINDINGS:\n';
    secondaryFindings.forEach(finding => {
      findings += `- ${finding}\n`;
    });
    findings += '\n';
  }

  // Additional user findings
  if (customization.additionalFindings) {
    findings += 'ADDITIONAL FINDINGS:\n';
    findings += `${customization.additionalFindings}\n\n`;
  }

  return findings.trim();
}

export function generateImpressionSection(
  condition: NeurologicalCondition,
  customization: ReportCustomization
): string {
  let impression = '';

  // Main impression
  const severity = customization.selectedSeverity;
  const laterality = customization.selectedLaterality;

  impression += `1. ${severity ? severity + ' ' : ''}${condition.name}`;

  if (customization.selectedLocation) {
    impression += ` at ${customization.selectedLocation}`;
  }

  if (laterality && laterality !== 'Bilateral') {
    impression += ` (${laterality})`;
  }

  impression += '.\n\n';

  // Differentials
  if (condition.differentials.length > 0) {
    impression += 'DIFFERENTIAL DIAGNOSES:\n';
    condition.differentials.forEach((diff, index) => {
      impression += `${index + 2}. ${diff}\n`;
    });
    impression += '\n';
  }

  // Custom impression
  if (customization.customImpression) {
    impression += customization.customImpression + '\n\n';
  }

  // Clinical notes
  if (condition.clinicalNotes) {
    impression += 'CLINICAL NOTES:\n';
    impression += `${condition.clinicalNotes}\n`;
  }

  return impression.trim();
}

export function generateRecommendationsSection(condition: NeurologicalCondition): string {
  if (condition.recommendations.length === 0) {
    return 'Consultation with a veterinary neurologist is recommended.';
  }

  let recommendations = 'RECOMMENDATIONS:\n';
  condition.recommendations.forEach((rec, index) => {
    recommendations += `${index + 1}. ${rec}\n`;
  });

  return recommendations.trim();
}

export function generateFullReport(
  condition: NeurologicalCondition,
  customization: ReportCustomization
): GeneratedReport {
  return {
    clinicalHistory: customization.clinicalHistory || 'Clinical history to be provided.',
    technique: generateTechniqueSection(condition),
    findings: generateFindingsSection(condition, customization),
    impression: generateImpressionSection(condition, customization),
    recommendations: generateRecommendationsSection(condition),
  };
}

export function formatReportForCopy(report: GeneratedReport): string {
  return `MRI REPORT

CLINICAL HISTORY:
${report.clinicalHistory}

TECHNIQUE:
${report.technique}

FINDINGS:
${report.findings}

IMPRESSION:
${report.impression}

RECOMMENDATIONS:
${report.recommendations}
`;
}
