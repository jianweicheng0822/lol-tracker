/** Match detail page — displays a full scoreboard for a single match with all 10 players. */
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { fetchMatchDetail } from "../api";
import type { MatchDetail } from "../types";
import {
  useDdragonVersion,
  ddragonBase,
  QUEUE_NAMES,
  formatDuration,
  timeAgo,
} from "../utils/ddragon";
import { ScoreboardTeamTable, ArenaScoreboard } from "../components/ScoreboardTable";

export default function MatchDetailPage() {
  const { region, matchId } = useParams<{ region: string; matchId: string }>();
  const [searchParams] = useSearchParams();
  const puuid = searchParams.get("puuid") || "";
  const navigate = useNavigate();

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
      } catch (e: any) {
        if (cancelled) return;
        setErrorMsg(e?.message || "Failed to load match.");
        setStatus("error");
      }
    };

    load();
    return () => { cancelled = true; };
  }, [region, matchId]);

  const myParticipant = match?.participants.find((p) => p.puuid === puuid);
  const myWin = myParticipant?.win;
  const queueName = match ? (QUEUE_NAMES[match.queueId] || "Normal") : "";

  return (
    <div style={styles.page}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <span style={styles.logo} onClick={() => navigate("/")}>LoL Tracker</span>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>Back</button>
      </div>

      <div style={styles.content}>
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
            <div style={{ ...styles.header, borderLeftColor: myWin ? "#2563eb" : "#dc2626" }}>
              <div>
                <span style={{ fontSize: 20, fontWeight: 700 }}>{queueName}</span>
                <span style={{ fontSize: 14, color: "#94a3b8", marginLeft: 12 }}>
                  {formatDuration(match.gameDurationSec)}
                </span>
                <span style={{ fontSize: 14, color: "#94a3b8", marginLeft: 12 }}>
                  {timeAgo(match.gameEndTimestamp)}
                </span>
              </div>
              {myParticipant && (
                <span style={{ fontSize: 18, fontWeight: 700, color: myWin ? "#60a5fa" : "#f87171" }}>
                  {myWin ? "Victory" : "Defeat"}
                </span>
              )}
            </div>

            {/* Scoreboard */}
            {match.queueId === 1700 ? (
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
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "#f8fafc",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    padding: "12px 24px",
    background: "#1e293b",
    borderBottom: "1px solid #334155",
  },
  logo: {
    fontWeight: 800,
    fontSize: 18,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  backBtn: {
    padding: "6px 14px",
    borderRadius: 6,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid #334155",
    color: "#cbd5e1",
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
    borderRadius: 8,
    borderLeft: "4px solid #334155",
  },
  loadingBox: {
    textAlign: "center",
    padding: 40,
    opacity: 0.6,
    fontSize: 16,
  },
  errorBox: {
    background: "#7f1d1d",
    color: "#fecaca",
    padding: 15,
    borderRadius: 8,
  },
};
