// Report generation functions

function generateMeningiomaReport() {
    const location = document.getElementById('mening-location').value || '[location]';
    const dimensions = document.getElementById('mening-dimensions').value || '[___ × ___ × ___]';
    const margin = document.getElementById('mening-margin').value;
    const shape = document.getElementById('mening-shape').value;
    const t2 = document.getElementById('mening-t2').value;
    const t1 = document.getElementById('mening-t1').value;
    const contrast = document.getElementById('mening-contrast').value;
    const edema = document.getElementById('mening-edema').value;
    const massEffect = document.getElementById('mening-mass-effect').value || 'no significant mass effect';
    const duralTail = document.getElementById('mening-dural').value;
    const additional = document.getElementById('mening-additional').value;

    let report = `There is an extra-axial, dural-based mass in the ${location} measuring approximately ${dimensions} cm, which is ${margin} and ${shape}. The lesion is ${t2} on T2-weighted images and ${t1} on T1-weighted images, with ${contrast} contrast enhancement. `;

    if (duralTail === 'present') {
        report += `A dural tail sign is present. `;
    }

    report += `Surrounding ${edema} perilesional edema is present with ${massEffect}. `;

    if (additional) {
        report += `${additional}. `;
    }

    report += `Overall, findings are most consistent with meningioma based on the extra-axial location, dural attachment, and imaging characteristics.`;

    return report;
}

function generateGliomaReport() {
    const location = document.getElementById('glioma-location').value || '[location]';
    const dimensions = document.getElementById('glioma-dimensions').value || '[___ × ___ × ___]';
    const margin = document.getElementById('glioma-margin').value;
    const shape = document.getElementById('glioma-shape').value;
    const t2 = document.getElementById('glioma-t2').value;
    const t1 = document.getElementById('glioma-t1').value;
    const contrast = document.getElementById('glioma-contrast').value;
    const edema = document.getElementById('glioma-edema').value;
    const massEffect = document.getElementById('glioma-mass-effect').value || 'mass effect is present';
    const additional = document.getElementById('glioma-additional').value;

    let report = `There is an intra-axial mass in the ${location} measuring approximately ${dimensions} cm, which is ${margin} and ${shape}. The lesion is ${t2} on T2/FLAIR sequences and ${t1} on T1-weighted images, with ${contrast} contrast enhancement. `;

    report += `Surrounding ${edema} perilesional edema is present with ${massEffect}. `;

    if (additional) {
        report += `${additional}. `;
    }

    report += `Overall, findings are most consistent with a glial neoplasm (glioma) based on the intra-axial location, infiltrative pattern, and imaging characteristics.`;

    return report;
}

function generateIVDDReport() {
    const level = document.getElementById('ivdd-level').value || '[disc space]';
    const hansen = document.getElementById('ivdd-hansen').value;
    const lateralization = document.getElementById('ivdd-lateralization').value;
    const stenosis = document.getElementById('ivdd-stenosis').value;
    const compression = document.getElementById('ivdd-compression').value;
    const t2 = document.getElementById('ivdd-t2').value;
    const t2Char = document.getElementById('ivdd-t2-char').value;
    const additionalDiscs = document.getElementById('ivdd-additional-discs').value;
    const additional = document.getElementById('ivdd-additional').value;

    let report = `There is ${hansen} disc herniation at ${level} with ${lateralization} ${stenosis} spinal canal stenosis. The herniated disc material causes ${compression}. `;

    if (t2 === 'present') {
        if (t2Char) {
            report += `T2-hyperintense signal is present within the spinal cord at this level, ${t2Char}, consistent with edema/myelomalacia. `;
        } else {
            report += `T2-hyperintense signal is present within the spinal cord at this level, consistent with edema/myelomalacia. `;
        }
    } else {
        report += `No T2-hyperintense signal is identified within the spinal cord. `;
    }

    if (additionalDiscs) {
        report += `Additional degenerative disc disease is noted at ${additionalDiscs}. `;
    }

    if (additional) {
        report += `${additional}. `;
    }

    report += `Overall, findings are consistent with ${hansen} intervertebral disc disease at ${level}.`;

    return report;
}

function generateFCEReport() {
    const level = document.getElementById('fce-level').value || '[cord level]';
    const lateralization = document.getElementById('fce-lateralization').value;
    const distribution = document.getElementById('fce-distribution').value;
    const t2 = document.getElementById('fce-t2').value;
    const t1 = document.getElementById('fce-t1').value;
    const contrast = document.getElementById('fce-contrast').value;
    const swelling = document.getElementById('fce-swelling').value;
    const additional = document.getElementById('fce-additional').value;

    let report = `There is a ${lateralization}-sided intramedullary lesion at the ${level} spinal cord level, ${distribution}. The lesion is ${t2} on T2-weighted images and ${t1} on T1-weighted images. `;

    report += `Contrast enhancement is ${contrast}. ${swelling.charAt(0).toUpperCase() + swelling.slice(1)} cord swelling is present. `;

    if (additional) {
        report += `${additional}. `;
    }

    report += `No compressive lesion is identified. Overall, findings are most consistent with an ischemic myelopathy, such as fibrocartilaginous embolism (FCE), based on the acute onset, asymmetric distribution, lack of mass effect, and absence of contrast enhancement.`;

    return report;
}

function generateMUOReport() {
    const location = document.getElementById('muo-location').value || '[location]';
    const distribution = document.getElementById('muo-distribution').value;
    const t2 = document.getElementById('muo-t2').value;
    const t1 = document.getElementById('muo-t1').value;
    const contrast = document.getElementById('muo-contrast').value;
    const massEffect = document.getElementById('muo-mass-effect').value;
    const meningeal = document.getElementById('muo-meningeal').value;
    const ventricles = document.getElementById('muo-ventricles').value || 'normal';
    const additional = document.getElementById('muo-additional').value;

    let report = `There are ${distribution} lesions predominantly involving the ${location}, which are ${t2} on T2/FLAIR sequences and ${t1} on T1-weighted images. Contrast enhancement is ${contrast}. `;

    report += `${massEffect.charAt(0).toUpperCase() + massEffect.slice(1)} mass effect is present. `;

    if (meningeal === 'present') {
        report += `Meningeal contrast enhancement is present. `;
    }

    report += `The ventricular system is ${ventricles}. `;

    if (additional) {
        report += `${additional}. `;
    }

    report += `Overall, findings are most consistent with meningoencephalitis of unknown origin (MUO), though other inflammatory/infectious etiologies cannot be excluded. Clinical correlation and CSF analysis are recommended.`;

    return report;
}

function generateStrokeReport() {
    const location = document.getElementById('stroke-location').value || '[location]';
    const territory = document.getElementById('stroke-territory').value;
    const lateralization = document.getElementById('stroke-lateralization').value;
    const t2 = document.getElementById('stroke-t2').value;
    const t1 = document.getElementById('stroke-t1').value;
    const contrast = document.getElementById('stroke-contrast').value;
    const massEffect = document.getElementById('stroke-mass-effect').value;
    const stage = document.getElementById('stroke-stage').value;
    const additional = document.getElementById('stroke-additional').value;

    let report = `There is a ${lateralization} lesion in the ${location}, corresponding to the ${territory} territory. The lesion is ${t2} on T2/FLAIR sequences and ${t1} on T1-weighted images. `;

    report += `Contrast enhancement is ${contrast}. ${massEffect.charAt(0).toUpperCase() + massEffect.slice(1)} mass effect is present. `;

    if (additional) {
        report += `${additional}. `;
    }

    report += `The imaging characteristics and distribution are consistent with an ${stage} cerebrovascular accident (stroke/infarct). Differential diagnoses include thromboembolism, vasculitis, or other vascular compromise.`;

    return report;
}

function generateCSMReport() {
    const level = document.getElementById('csm-level').value || '[level]';
    const type = document.getElementById('csm-type').value;
    const stenosis = document.getElementById('csm-stenosis').value;
    const dynamic = document.getElementById('csm-dynamic').value;
    const cordSignal = document.getElementById('csm-cord-signal').value;
    const atrophy = document.getElementById('csm-atrophy').value;
    const factors = document.getElementById('csm-factors').value || 'degenerative changes';
    const additional = document.getElementById('csm-additional').value;

    let report = `There is ${stenosis} spinal canal stenosis at ${level} due to ${type} cervical spondylomyelopathy. `;

    report += `Contributing factors include ${factors}. `;

    if (dynamic !== 'not assessed') {
        report += `A dynamic component is ${dynamic}. `;
    }

    report += `The spinal cord signal is ${cordSignal}. `;

    if (atrophy === 'present') {
        report += `Spinal cord atrophy is present at the affected level. `;
    }

    if (additional) {
        report += `${additional}. `;
    }

    report += `Overall, findings are consistent with cervical spondylomyelopathy (Wobbler syndrome) at ${level}.`;

    return report;
}

function generateSyrinxReport() {
    const location = document.getElementById('syrinx-location').value || '[location]';
    const width = document.getElementById('syrinx-width').value || '[width]';
    const type = document.getElementById('syrinx-type').value;
    const chiari = document.getElementById('syrinx-chiari').value;
    const chiariDetails = document.getElementById('syrinx-chiari-details').value;
    const cause = document.getElementById('syrinx-cause').value;
    const atrophy = document.getElementById('syrinx-atrophy').value;
    const septations = document.getElementById('syrinx-septations').value;
    const additional = document.getElementById('syrinx-additional').value;

    let report = `There is ${type} extending from ${location}, with a maximal width of ${width} mm. `;

    if (septations === 'present') {
        report += `Septations are present within the cavity. `;
    }

    if (chiari === 'present') {
        if (chiariDetails) {
            report += `An associated Chiari-like malformation is present, characterized by ${chiariDetails}. `;
        } else {
            report += `An associated Chiari-like malformation is present. `;
        }
    }

    if (cause) {
        report += `Additional findings include ${cause}. `;
    }

    if (atrophy === 'present') {
        report += `Spinal cord atrophy is present. `;
    }

    if (additional) {
        report += `${additional}. `;
    }

    report += `Overall, findings are consistent with syringohydromyelia`;

    if (chiari === 'present') {
        report += ` secondary to Chiari-like malformation`;
    } else if (cause) {
        report += ` likely secondary to the identified cause`;
    }

    report += `.`;

    return report;
}

function generateSpinalTumorReport() {
    const location = document.getElementById('tumor-location').value || '[location]';
    const tumorType = document.getElementById('tumor-type').value;
    const cordLocation = document.getElementById('tumor-cord-location').value;
    const dimensions = document.getElementById('tumor-dimensions').value || '[___ × ___ × ___]';
    const margin = document.getElementById('tumor-margin').value;
    const t2 = document.getElementById('tumor-t2').value;
    const t1 = document.getElementById('tumor-t1').value;
    const contrast = document.getElementById('tumor-contrast').value;
    const compression = document.getElementById('tumor-compression').value;
    const cordSignal = document.getElementById('tumor-cord-signal').value;
    const bone = document.getElementById('tumor-bone').value;
    const boneDetails = document.getElementById('tumor-bone-details').value;
    const additional = document.getElementById('tumor-additional').value;

    let report = `There is an ${cordLocation} mass at the ${location}, measuring approximately ${dimensions} cm, which is ${margin}. The lesion is ${t2} on T2-weighted images and ${t1} on T1-weighted images, with ${contrast} contrast enhancement. `;

    report += `The mass causes ${compression} spinal cord compression. ${cordSignal.charAt(0).toUpperCase() + cordSignal.slice(1)} within the spinal cord at this level. `;

    if (bone === 'present') {
        if (boneDetails) {
            report += `Bone involvement is present, with ${boneDetails}. `;
        } else {
            report += `Bone involvement is present. `;
        }
    } else {
        report += `No bone involvement is identified. `;
    }

    if (additional) {
        report += `${additional}. `;
    }

    report += `Overall, imaging characteristics are most consistent with ${tumorType} based on the location, signal characteristics, and pattern of enhancement.`;

    return report;
}
