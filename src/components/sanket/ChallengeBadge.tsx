import { Chip } from "@/components/sanket/StatusBadge";
import {
  CHALLENGE_STATUS_LABEL,
  CHALLENGE_STATUS_TONE,
  PROJECT_STATUS_LABEL,
  type ChallengeStatus,
  type ProjectStatus,
} from "@/lib/innovation";

export function ChallengeBadge({ status }: { status: ChallengeStatus }) {
  return <Chip tone={CHALLENGE_STATUS_TONE[status]}>{CHALLENGE_STATUS_LABEL[status]}</Chip>;
}

export function ProjectBadge({ status }: { status: ProjectStatus }) {
  const tone =
    status === "completed" || status === "deployed"
      ? "success"
      : status === "stalled"
        ? "destructive"
        : "warning";
  return <Chip tone={tone}>{PROJECT_STATUS_LABEL[status]}</Chip>;
}
