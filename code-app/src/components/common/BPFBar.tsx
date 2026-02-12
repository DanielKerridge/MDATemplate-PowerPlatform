import { makeStyles } from "@fluentui/react-components";
import { CheckmarkCircleFilled } from "@fluentui/react-icons";
import { BPF_STAGES } from "@/config/constants";

interface BPFBarProps {
  currentStage: number | undefined;
  onStageClick?: (stage: number) => void;
}

const useStyles = makeStyles({
  root: {
    display: "flex",
    alignItems: "center",
    padding: "20px 24px 16px",
    backgroundColor: "#fff",
    gap: "0",
    overflow: "auto",
    marginTop: "16px",
  },
  track: {
    display: "flex",
    alignItems: "center",
    flex: 1,
    gap: "0",
    position: "relative",
  },
  stageWrapper: {
    display: "flex",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  stage: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 20px",
    cursor: "default",
    position: "relative",
    whiteSpace: "nowrap",
    borderRadius: "4px",
    flex: 1,
    minWidth: 0,
    transitionProperty: "background-color",
    transitionDuration: "0.15s",
  },
  stageClickable: {
    cursor: "pointer",
    ":hover": {
      backgroundColor: "#f3f2f1",
    },
  },
  stageCompleted: {
    color: "#107c10",
  },
  stageCurrent: {
    fontWeight: 600,
    color: "#0078d4",
    backgroundColor: "#deecf9",
    borderRadius: "4px",
  },
  stageFuture: {
    color: "#a19f9d",
  },
  chevron: {
    fontSize: "20px",
    color: "#c8c6c4",
    padding: "0 10px",
    userSelect: "none",
    flexShrink: 0,
    lineHeight: 1,
  },
  indicator: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontSize: "12px",
    fontWeight: 700,
  },
  indicatorCompleted: {
    backgroundColor: "#dff6dd",
    color: "#107c10",
  },
  indicatorCurrent: {
    backgroundColor: "#0078d4",
    color: "#fff",
  },
  indicatorFuture: {
    backgroundColor: "#edebe9",
    color: "#a19f9d",
  },
  stageLabel: {
    fontSize: "14px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  progressBar: {
    height: "3px",
    backgroundColor: "#edebe9",
    borderRadius: "2px",
    margin: "12px 24px 16px",
    position: "relative",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#0078d4",
    borderRadius: "2px",
    transitionProperty: "width",
    transitionDuration: "0.3s",
  },
});

export function BPFBar({ currentStage, onStageClick }: BPFBarProps) {
  const styles = useStyles();
  const stageValue = typeof currentStage === "string" ? Number(currentStage) : (currentStage ?? 10000);

  // Calculate progress percentage
  const currentIdx = BPF_STAGES.findIndex((s) => s.value === stageValue);
  const progressPct = currentIdx >= 0 ? ((currentIdx + 0.5) / BPF_STAGES.length) * 100 : 0;

  return (
    <div role="group" aria-label="Business Process Flow stages">
      <div className={styles.root}>
        <div className={styles.track}>
          {BPF_STAGES.map((stage, index) => {
            const isCompleted = stage.value < stageValue;
            const isCurrent = stage.value === stageValue;
            const isFuture = stage.value > stageValue;
            const canClick = isFuture && !!onStageClick;

            return (
              <div key={stage.value} className={styles.stageWrapper}>
                <div
                  className={[
                    styles.stage,
                    isCompleted ? styles.stageCompleted : isCurrent ? styles.stageCurrent : styles.stageFuture,
                    canClick ? styles.stageClickable : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() => {
                    if (canClick) onStageClick!(stage.value);
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && canClick) {
                      e.preventDefault();
                      onStageClick!(stage.value);
                    }
                  }}
                  role="button"
                  tabIndex={canClick ? 0 : -1}
                  aria-label={`${stage.label}${isCompleted ? " (completed)" : isCurrent ? " (current)" : " (upcoming)"}`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <div
                    className={[
                      styles.indicator,
                      isCompleted ? styles.indicatorCompleted : isCurrent ? styles.indicatorCurrent : styles.indicatorFuture,
                    ].join(" ")}
                  >
                    {isCompleted ? (
                      <CheckmarkCircleFilled style={{ fontSize: 20, color: "#107c10" }} />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <span className={styles.stageLabel}>{stage.label}</span>
                </div>
                {index < BPF_STAGES.length - 1 && (
                  <span className={styles.chevron}>&#8250;</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {/* Progress bar */}
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
      </div>
    </div>
  );
}
