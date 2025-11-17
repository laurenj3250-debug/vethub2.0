/**
 * Google Docs Label Generator
 *
 * Uses Google Docs templates to generate perfectly formatted patient labels.
 * Much more reliable than HTML/CSS for consistent formatting.
 */

import { google } from 'googleapis';
import { UnifiedPatient } from '@/contexts/PatientContext';

// Google Docs API v1
const docs = google.docs('v1');
const drive = google.drive('v3');

/**
 * Template IDs - Update these with your actual Google Docs template IDs
 *
 * To get template ID:
 * 1. Create a Google Doc with your sticker format
 * 2. Use placeholders like {{PatientName}}, {{OwnerName}}, etc.
 * 3. Copy the document ID from the URL: https://docs.google.com/document/d/DOCUMENT_ID/edit
 */
const TEMPLATE_IDS = {
  BIG_LABEL: process.env.GOOGLE_DOCS_BIG_LABEL_TEMPLATE_ID || '',
  TINY_LABEL: process.env.GOOGLE_DOCS_TINY_LABEL_TEMPLATE_ID || '',
};

/**
 * Initialize Google Auth
 *
 * Setup instructions:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing
 * 3. Enable Google Docs API and Google Drive API
 * 4. Create OAuth 2.0 credentials (Desktop app)
 * 5. Download credentials JSON and save as google-credentials.json in project root
 * 6. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI to .env
 */
function getAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
  );

  // Set refresh token if available (from env or database)
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
  }

  return oauth2Client;
}

/**
 * Copy a Google Docs template
 */
async function copyTemplate(templateId: string, newName: string) {
  const auth = getAuthClient();
  const response = await drive.files.copy({
    auth,
    fileId: templateId,
    requestBody: {
      name: newName,
    },
  });

  return response.data.id;
}

/**
 * Replace placeholders in a Google Doc
 */
async function replacePlaceholders(documentId: string, replacements: Record<string, string>) {
  const auth = getAuthClient();

  // Build replace requests
  const requests = Object.entries(replacements).map(([placeholder, value]) => ({
    replaceAllText: {
      containsText: {
        text: `{{${placeholder}}}`,
        matchCase: true,
      },
      replaceText: value || '',
    },
  }));

  // Apply all replacements in one batch
  await docs.documents.batchUpdate({
    auth,
    documentId,
    requestBody: {
      requests,
    },
  });
}

/**
 * Export Google Doc as PDF
 */
async function exportAsPDF(documentId: string): Promise<Buffer> {
  const auth = getAuthClient();

  const response = await drive.files.export(
    {
      auth,
      fileId: documentId,
      mimeType: 'application/pdf',
    },
    { responseType: 'arraybuffer' }
  );

  return Buffer.from(response.data as ArrayBuffer);
}

/**
 * Delete a Google Doc
 */
async function deleteDocument(documentId: string) {
  const auth = getAuthClient();
  await drive.files.delete({
    auth,
    fileId: documentId,
  });
}

/**
 * Generate big labels for a single patient using Google Docs template
 */
export async function generateBigLabelsFromTemplate(patient: UnifiedPatient): Promise<Buffer> {
  if (!TEMPLATE_IDS.BIG_LABEL) {
    throw new Error('Google Docs big label template ID not configured. Set GOOGLE_DOCS_BIG_LABEL_TEMPLATE_ID in .env');
  }

  const demo = patient.demographics;

  // Create a temporary copy of the template
  const documentName = `${demo.name} - Big Labels - ${new Date().toISOString()}`;
  const documentId = await copyTemplate(TEMPLATE_IDS.BIG_LABEL, documentName);

  if (!documentId) {
    throw new Error('Failed to copy Google Docs template');
  }

  try {
    // Prepare replacements
    const replacements = {
      PatientName: demo.name || '',
      ClientID: demo.clientId || '',
      PatientID: demo.patientId || '',
      OwnerName: demo.ownerName || '',
      OwnerPhone: demo.ownerPhone || '',
      Species: demo.species || 'Canine',
      Breed: demo.breed || '',
      Color: demo.colorMarkings || '',
      Sex: demo.sex || '',
      Weight: demo.weight || '',
      DOB: demo.dateOfBirth || '',
      Age: demo.age || '',
    };

    // Replace all placeholders
    await replacePlaceholders(documentId, replacements);

    // Export as PDF
    const pdfBuffer = await exportAsPDF(documentId);

    // Clean up: delete the temporary document
    await deleteDocument(documentId);

    return pdfBuffer;
  } catch (error) {
    // Make sure to clean up even if there's an error
    try {
      await deleteDocument(documentId);
    } catch (cleanupError) {
      console.error('Failed to clean up temporary document:', cleanupError);
    }
    throw error;
  }
}

/**
 * Generate big labels for multiple patients
 */
export async function generateBigLabelsForAllPatients(patients: UnifiedPatient[]): Promise<Buffer> {
  // For multiple patients, we need to merge PDFs
  // For now, generate individually and let the user print them one by one
  // TODO: Implement PDF merging if needed

  if (patients.length === 0) {
    throw new Error('No patients provided');
  }

  // For single patient, just generate normally
  if (patients.length === 1) {
    return generateBigLabelsFromTemplate(patients[0]);
  }

  // For multiple patients, generate the first one
  // In a real implementation, you'd merge all PDFs
  // For now, we'll just generate the first and note this limitation
  console.warn('Multiple patient PDF generation not yet implemented. Generating first patient only.');
  return generateBigLabelsFromTemplate(patients[0]);
}

/**
 * Generate a URL for Google OAuth consent
 * User needs to authorize the app to access their Google Docs
 */
export function getGoogleAuthUrl(): string {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
  );

  const scopes = [
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive.file',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force consent to get refresh token
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
  );

  const { tokens } = await oauth2Client.getToken(code);

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
  };
}
