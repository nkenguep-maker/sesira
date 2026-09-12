import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Gauge,
  PenLine,
  ShieldCheck,
} from "lucide-react";

import {
  completeProcedureRunAction,
  markProcedureReadyAction,
  startProcedureRunAction,
  submitProcedureStepAction,
  uploadBinaryEvidenceAction,
} from "@/app/app/terrain/actions";
import type {
  TerrainBinaryEvidence,
  TerrainEquipmentContext,
  TerrainProcedureRun,
  TerrainProcedureStep,
  TerrainProcedureTemplate,
  TerrainRegulatoryExport,
} from "@/lib/data/terrain-procedure-ui";

import styles from "./terrain-procedure.module.css";

type Props = {
  date: string;
  interventionId: string;
  templates: TerrainProcedureTemplate[];
  run: TerrainProcedureRun | null;
  equipment: TerrainEquipmentContext | null;
  regulatoryExport: TerrainRegulatoryExport | null;
  binaries: TerrainBinaryEvidence[];
};

export function TerrainProcedurePanel({ date, interventionId, templates, run, equipment, regulatoryExport, binaries }: Props) {
  const regulatoryGap = regulatoryExport && regulatoryExport.gapCount > 0 ? regulatoryExport : null;

  return (
    <>
      {(equipment || regulatoryGap) ? (
        <section className={styles.contextGrid} aria-label="Informations utiles pour l'intervention">
          {equipment ? <EquipmentCard equipment={equipment} /> : null}
          {regulatoryGap ? <RegulatoryCard item={regulatoryGap} /> : null}
        </section>
      ) : null}

      {!run ? (
        <section className={styles.procedureCard} aria-labelledby="procedure-start-title">
          <div className={styles.captureHeader}>
            <div>
              <span className={styles.kicker}>Travail à faire</span>
              <h3 id="procedure-start-title">Démarrer la procédure</h3>
              <p>Choisissez le déroulé prévu pour cette mission.</p>
            </div>
          </div>
          {templates.length ? (
            <div className={styles.templateList}>
              {templates.map((template) => (
                <form action={startProcedureRunAction} key={template.id}>
                  <input type="hidden" name="interventionId" value={interventionId} />
                  <input type="hidden" name="focus" value={interventionId} />
                  <input type="hidden" name="date" value={date} />
                  <input type="hidden" name="templateId" value={template.id} />
                  <button className={styles.templateButton} type="submit">
                    <span><strong>{template.label}</strong><small>Version {template.version}</small></span>
                    <ClipboardCheck size={18} />
                  </button>
                </form>
              ))}
            </div>
          ) : (
            <p className={styles.helper}>Aucune procédure n’est disponible pour cette mission.</p>
          )}
        </section>
      ) : (
        <ProcedureRunPanel date={date} interventionId={interventionId} run={run} binaries={binaries} />
      )}
    </>
  );
}

function ProcedureRunPanel({ date, interventionId, run, binaries }: { date: string; interventionId: string; run: TerrainProcedureRun; binaries: TerrainBinaryEvidence[] }) {
  const required = run.steps.filter((step) => step.required);
  const completedRequired = required.filter(isStepSatisfied).length;
  const progress = required.length ? Math.round((completedRequired / required.length) * 100) : 100;
  const current = run.steps.find((step) => !isStepSatisfied(step)) ?? null;
  const conflicts = run.steps.filter((step) => step.result?.syncStatus === "CONFLICT").length + binaries.filter((item) => item.status === "CONFLICT").length;

  return (
    <section className={styles.procedureCard} aria-labelledby="procedure-title">
      <div className={styles.procedureHeader}>
        <div>
          <span className={styles.kicker}>Mission en cours</span>
          <h3 id="procedure-title">{run.templateLabel}</h3>
          <p>{completedRequired}/{required.length || run.steps.length} étapes terminées · {procedureStatusLabel(run.status)}</p>
        </div>
        <strong>{progress}%</strong>
      </div>

      <div className={styles.progressTrack} aria-label={`Progression ${progress}%`}><span style={{ width: `${progress}%` }} /></div>

      {conflicts ? <div className={styles.notice}><AlertTriangle size={17} /><span>{conflicts} élément{conflicts > 1 ? "s" : ""} à vérifier avant de terminer.</span></div> : null}

      {current && run.status !== "COMPLETED" ? (
        <div className={styles.currentStep}>
          <div className={styles.currentStepHeader}>
            <span className={styles.stepIndex}>{current.ordinal}</span>
            <div><span className={styles.kicker}>Maintenant</span><h4>{current.wording}</h4></div>
          </div>
          <StepForm date={date} interventionId={interventionId} runId={run.id} step={current} />
        </div>
      ) : null}

      {run.status === "IN_PROGRESS" && !current ? (
        <form action={markProcedureReadyAction} className={styles.stepForm}>
          <input type="hidden" name="runId" value={run.id} />
          <input type="hidden" name="focus" value={interventionId} />
          <input type="hidden" name="date" value={date} />
          <button className={styles.primaryAction} type="submit"><FileCheck2 size={17} /> Relire avant de terminer</button>
        </form>
      ) : null}

      {run.status === "READY_FOR_REVIEW" ? (
        <form action={completeProcedureRunAction} className={styles.reviewCard}>
          <input type="hidden" name="runId" value={run.id} />
          <input type="hidden" name="focus" value={interventionId} />
          <input type="hidden" name="date" value={date} />
          <label><span>Note de fin facultative</span><textarea name="reviewNotes" maxLength={2000} placeholder="Ajouter seulement ce qui est utile au dossier." /></label>
          <button className={styles.primaryAction} type="submit"><CheckCircle2 size={17} /> Terminer la procédure</button>
        </form>
      ) : null}

      {run.status === "COMPLETED" ? (
        <div className={`${styles.notice} ${styles.noticeGood}`}><CheckCircle2 size={17} /><span>Procédure terminée.</span></div>
      ) : null}
    </section>
  );
}

function StepForm({ date, interventionId, runId, step }: { date: string; interventionId: string; runId: string; step: TerrainProcedureStep }) {
  if (step.kind === "PHOTO" || step.kind === "SIGNATURE") {
    const signature = step.kind === "SIGNATURE";
    return (
      <form action={uploadBinaryEvidenceAction} className={styles.stepForm}>
        <input type="hidden" name="interventionId" value={interventionId} />
        <input type="hidden" name="focus" value={interventionId} />
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="runId" value={runId} />
        <input type="hidden" name="stepId" value={step.id} />
        <input type="hidden" name="kind" value={step.kind} />
        {signature ? (
          <>
            <label><span>Nom du signataire</span><input name="signerName" required maxLength={200} autoComplete="name" /></label>
            <label><span>Rôle</span><select name="signerRole" defaultValue="CUSTOMER"><option value="CUSTOMER">Client</option><option value="SITE_MANAGER">Responsable du site</option><option value="OTHER">Autre</option></select></label>
            <p className={styles.helper}>Émargement client : prise de connaissance du compte rendu.</p>
          </>
        ) : null}
        <label className={styles.filePicker}>
          {signature ? <PenLine size={22} /> : <Camera size={22} />}
          <span>{signature ? "Ajouter l’émargement" : "Prendre une photo"}</span>
          <input name="file" type="file" accept="image/*" capture={signature ? undefined : "environment"} required />
        </label>
        <button className={styles.primaryAction} type="submit">{signature ? "Enregistrer l’émargement" : "Enregistrer la photo"}</button>
      </form>
    );
  }

  return (
    <form action={submitProcedureStepAction} className={styles.stepForm}>
      <input type="hidden" name="interventionId" value={interventionId} />
      <input type="hidden" name="focus" value={interventionId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="runId" value={runId} />
      <input type="hidden" name="stepId" value={step.id} />
      <input type="hidden" name="kind" value={step.kind} />

      {step.kind === "CHECK" || step.kind === "REGULATORY_CONFIRMATION" ? (
        <label className={styles.confirmCheck}><input type="checkbox" name="checked" value="yes" required /><span>{step.kind === "REGULATORY_CONFIRMATION" ? "Vérification effectuée" : "Étape effectuée"}</span></label>
      ) : null}

      {step.kind === "TEXT" ? <label><span>Observation</span><textarea name="text" required maxLength={4000} /></label> : null}

      {step.kind === "MEASUREMENT" ? (
        <div className={styles.formGrid}>
          <label><span>Valeur</span><input name="value" type="number" inputMode="decimal" step="any" required /></label>
          <label><span>Unité</span><input name="unit" defaultValue={step.unit ?? ""} readOnly={Boolean(step.unit)} required={Boolean(step.unit)} placeholder="Unité" /></label>
        </div>
      ) : null}

      {step.kind === "PART" ? (
        <>
          <label><span>Pièce utilisée</span><input name="partLabel" required maxLength={200} /></label>
          <div className={styles.formGrid}><label><span>Référence</span><input name="partCode" maxLength={100} /></label><label><span>Quantité</span><input name="quantity" type="number" inputMode="decimal" min="0.001" step="any" required /></label></div>
        </>
      ) : null}

      {step.kind === "MEASUREMENT" && (step.rangeMin !== null || step.rangeMax !== null) ? <p className={styles.helper}>Repère : {rangeLabel(step)}. Une valeur hors plage sera signalée pour vérification.</p> : null}
      <button className={styles.primaryAction} type="submit">Continuer</button>
    </form>
  );
}

function EquipmentCard({ equipment }: { equipment: TerrainEquipmentContext }) {
  return (
    <article className={styles.contextCard}>
      <div className={styles.contextIcon}><Gauge size={19} /></div>
      <span className={styles.kicker}>Équipement</span>
      <h3>{equipment.label}</h3>
      <p>{equipment.category}{equipment.fluidCode ? ` · ${equipment.fluidCode}` : ""}{equipment.chargeKg !== null ? ` · ${equipment.chargeKg} kg` : ""}</p>
      <small>{leakDueCopy(equipment)}</small>
    </article>
  );
}

function RegulatoryCard({ item }: { item: TerrainRegulatoryExport }) {
  return (
    <article className={styles.contextCard}>
      <div className={styles.contextIcon}><ShieldCheck size={19} /></div>
      <span className={styles.kicker}>À compléter</span>
      <h3>{item.gapCount} donnée{item.gapCount > 1 ? "s" : ""} manquante{item.gapCount > 1 ? "s" : ""}</h3>
      <p>Ces informations sont utiles au dossier de l’intervention.</p>
    </article>
  );
}

function isStepSatisfied(step: TerrainProcedureStep) {
  return step.result?.syncStatus === "SYNCED";
}

function procedureStatusLabel(status: TerrainProcedureRun["status"]) {
  return ({ NOT_STARTED: "À démarrer", IN_PROGRESS: "En cours", READY_FOR_REVIEW: "À relire", COMPLETED: "Terminée", NEEDS_ATTENTION: "À vérifier" } as Record<string, string>)[status] ?? status;
}

function rangeLabel(step: TerrainProcedureStep) {
  if (step.rangeMin !== null && step.rangeMax !== null) return `${step.rangeMin} à ${step.rangeMax}${step.unit ? ` ${step.unit}` : ""}`;
  if (step.rangeMin !== null) return `≥ ${step.rangeMin}${step.unit ? ` ${step.unit}` : ""}`;
  if (step.rangeMax !== null) return `≤ ${step.rangeMax}${step.unit ? ` ${step.unit}` : ""}`;
  return "non renseignée";
}

function leakDueCopy(equipment: TerrainEquipmentContext) {
  if (!equipment.nextLeakCheck || equipment.nextLeakCheck.status === "UNAVAILABLE") return "Échéance non disponible";
  if (equipment.nextLeakCheck.status === "OUT_OF_SCOPE") return "Pas d’échéance calculée pour cet équipement";
  return `Prochaine échéance : ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(equipment.nextLeakCheck.nextDueAt))}`;
}
