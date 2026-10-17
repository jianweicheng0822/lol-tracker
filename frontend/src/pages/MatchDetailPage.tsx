/**
 * @file MatchDetailPage.tsx
 * @description Standalone match detail page displaying full scoreboard for all participants.
 * @module frontend.pages
 *
 * Use ArenaScoreboard for Arena matches (placement-based grouping) and
 * ScoreboardTeamTable for standard 5v5 modes. Player names are clickable
 * to navigate to their match history.
 */
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { fetchMatchDetail } from "../api";
import type { MatchDetail } from "../types";
import {
  useDdragonVersion,
  ddragonBase,
  queueLabel,
  isArenaQueue,
  formatDuration,
  timeAgo,
} from "../utils/ddragon";
import { ScoreboardTeamTable, ArenaScoreboard } from "../components/ScoreboardTable";
import { COLORS } from "../utils/colors";
import AppHeader from "../components/AppHeader";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function MatchDetailPage() {
  const { region, matchId } = useParams<{ region: string; matchId: string }>();
  useDocumentTitle("Match details");
  const [searchParams] = useSearchParams();
  const puuid = searchParams.get("puuid") || "";
  const navigate = useNavigate();
  const location = useLocation();

  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const ddVersion = useDdragonVersion();
  const imgBase = ddragonBase(ddVersion);

  useEffect(() => {
    if (!region || !matchId) return;
    let cancelled = false;

    const load = async () => {
      setStatus("loading");
      try {
        const data = await fetchMatchDetail(matchId, region);
        if (cancelled) return;
        setMatch(data);
        setStatus("done");
      } catch (e: unknown) {
        if (cancelled) return;
        setErrorMsg(e instanceof Error ? e.message : "Failed to load match.");
        setStatus("error");
      }
    };

    load();
    return () => { cancelled = true; };
  }, [region, matchId]);

  const myParticipant = match?.participants.find((p) => p.puuid === puuid);
  const myWin = myParticipant?.win;
  const queueName = match ? queueLabel(match.queueId) : "";

  return (
    <div style={styles.page}>
      <AppHeader />

      <div style={styles.content}>
        {/* Opened from a shared link there is no page to go back to, so go home instead */}
        <button onClick={() => (location.key === "default" ? navigate("/") : navigate(-1))} style={styles.backBtn}>&larr; Back</button>
        {status === "loading" && (
          <div style={styles.loadingBox}>Loading match details...</div>
        )}

        {status === "error" && (
          <div style={styles.errorBox}>
            <strong>Error:</strong> {errorMsg}
          </div>
        )}

        {status === "done" && match && (
          <>
            {/* Match header */}
            <div style={{ ...styles.header, borderLeftColor: myWin ? "#0AC8B9" : "#E84057" }}>
              <div>
                <span style={{ fontSize: 20, fontWeight: 700 }}>{queueName}</span>
                <span style={{ fontSize: 14, color: COLORS.textTertiary, marginLeft: 12 }}>
                  {formatDuration(match.gameDurationSec)}
                </span>
                <span style={{ fontSize: 14, color: COLORS.textTertiary, marginLeft: 12 }}>
                  {timeAgo(match.gameEndTimestamp)}
                </span>
              </div>
              {myParticipant && (
                <span style={{ fontSize: 18, fontWeight: 700, color: myWin ? "#0AC8B9" : "#E84057" }}>
                  {myWin ? "Victory" : "Defeat"}
                </span>
              )}
            </div>

            {/* Scoreboard: scrolls sideways on its own when wider than the page */}
            <div style={{ overflowX: "auto" }} data-testid="scoreboard-scroll">
              {isArenaQueue(match.queueId) ? (
                <ArenaScoreboard
                  participants={match.participants}
                  imgBase={imgBase}
                  highlightPuuid={puuid}
                  region={region}
                />
              ) : (
                match.teams.map((team) => {
                  const teamPlayers = match.participants.filter((p) => p.teamId === team.teamId);
                  return (
                    <ScoreboardTeamTable
                      key={team.teamId}
                      team={team}
                      participants={teamPlayers}
                      imgBase={imgBase}
                      highlightPuuid={puuid}
                      queueId={match.queueId}
                      region={region}
                    />
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "transparent",
    color: COLORS.textPrimary,
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  backBtn: {
    padding: "6px 14px",
    borderRadius: 3,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid #1E2328",
    color: "#B8A88A",
    cursor: "pointer",
    fontSize: 13,
  },
  content: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "30px 20px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    padding: "16px 20px",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 3,
    borderLeft: "4px solid #1E2328",
  },
  loadingBox: {
    textAlign: "center",
    padding: 40,
    opacity: 0.6,
    fontSize: 16,
  },
  errorBox: {
    background: "#2d1111",
    color: "#E88A8A",
    padding: 15,
    borderRadius: 3,
  },
};
