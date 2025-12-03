import React from "https://esm.sh/react@18.2.0";
import { ImageResponse } from "https://deno.land/x/og_edge@0.0.4/mod.ts";

export default async function (request: Request) {
    const url = new URL(request.url);
    const params = url.searchParams;

    const title = params.get("title") || "Gittensor";
    const subtitle = params.get("subtitle") || "Autonomous Software Development";
    const avatar = params.get("avatar");
    const score = params.get("score");
    const prs = params.get("prs");
    const commits = params.get("commits");
    const additions = parseInt(params.get("additions") || "0");
    const deletions = parseInt(params.get("deletions") || "0");
    const rank = params.get("rank");
    const weight = params.get("weight");
    const type = params.get("type") || "default"; // 'miner' or 'repo'

    // Calculate stats bar width
    const totalChanges = additions + deletions;
    const addPercent = totalChanges > 0 ? (additions / totalChanges) * 100 : 50;
    const delPercent = totalChanges > 0 ? (deletions / totalChanges) * 100 : 50;

    // Font loading (optional, using system fonts for now or default sans)
    // Satori supports loading fonts, but for simplicity/speed we'll start with default

    return new ImageResponse(
        (
            <div
                style={{
                    height: "100%",
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#000000",
                    color: "white",
                    fontFamily: "sans-serif",
                    padding: "40px",
                    position: "relative",
                }}
            >
                {/* Background Grid Effect */}
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: "linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)",
                        backgroundSize: "40px 40px",
                        opacity: 0.1,
                        zIndex: 0,
                    }}
                />

                {/* Main Content Container */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "row",
                        width: "100%",
                        height: "100%",
                        zIndex: 1,
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    {/* Left Side: Info & Stats */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            height: "100%",
                            flex: 1,
                            paddingRight: "40px",
                        }}
                    >
                        {/* Header */}
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <div
                                style={{
                                    fontSize: 24,
                                    color: "#888",
                                    marginBottom: "8px",
                                    textTransform: "uppercase",
                                    letterSpacing: "2px",
                                }}
                            >
                                Gittensor
                            </div>
                            <div
                                style={{
                                    fontSize: 64,
                                    fontWeight: "bold",
                                    color: "white",
                                    lineHeight: 1.1,
                                    marginBottom: "16px",
                                    textShadow: "0 0 20px rgba(0, 255, 255, 0.3)",
                                }}
                            >
                                {title}
                            </div>
                            <div
                                style={{
                                    fontSize: 32,
                                    color: "#ccc",
                                    display: "flex",
                                    alignItems: "center",
                                }}
                            >
                                {rank && (
                                    <div
                                        style={{
                                            backgroundColor: "#00ffcc",
                                            color: "black",
                                            padding: "4px 12px",
                                            borderRadius: "20px",
                                            fontSize: 24,
                                            fontWeight: "bold",
                                            marginRight: "16px",
                                        }}
                                    >
                                        Rank #{rank}
                                    </div>
                                )}
                                {subtitle}
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "row",
                                gap: "40px",
                                marginTop: "auto",
                            }}
                        >
                            {score && (
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                    <div style={{ fontSize: 20, color: "#888" }}>Score</div>
                                    <div style={{ fontSize: 36, fontWeight: "bold" }}>{score}</div>
                                </div>
                            )}
                            {weight && (
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                    <div style={{ fontSize: 20, color: "#888" }}>Weight</div>
                                    <div style={{ fontSize: 36, fontWeight: "bold" }}>{weight}</div>
                                </div>
                            )}
                            {prs && (
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                    <div style={{ fontSize: 20, color: "#888" }}>PRs</div>
                                    <div style={{ fontSize: 36, fontWeight: "bold" }}>{prs}</div>
                                </div>
                            )}
                            {commits && (
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                    <div style={{ fontSize: 20, color: "#888" }}>Commits</div>
                                    <div style={{ fontSize: 36, fontWeight: "bold" }}>{commits}</div>
                                </div>
                            )}
                        </div>

                        {/* Code Frequency Bar */}
                        {(additions > 0 || deletions > 0) && (
                            <div style={{ display: "flex", flexDirection: "column", marginTop: "30px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: 20, color: "#aaa" }}>
                                    <span style={{ color: "#4ade80" }}>+{additions.toLocaleString()}</span>
                                    <span style={{ color: "#f87171" }}>-{deletions.toLocaleString()}</span>
                                </div>
                                <div
                                    style={{
                                        width: "100%",
                                        height: "12px",
                                        backgroundColor: "#333",
                                        borderRadius: "6px",
                                        overflow: "hidden",
                                        display: "flex",
                                    }}
                                >
                                    <div style={{ width: `${addPercent}%`, height: "100%", backgroundColor: "#4ade80" }} />
                                    <div style={{ width: `${delPercent}%`, height: "100%", backgroundColor: "#f87171" }} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Side: Avatar */}
                    {avatar && (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <img
                                src={avatar}
                                width="300"
                                height="300"
                                style={{
                                    borderRadius: "50%",
                                    border: "8px solid #333",
                                    boxShadow: "0 0 40px rgba(0,0,0,0.5)",
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
        }
    );
}

export const config = {
    path: "/og-image",
};
