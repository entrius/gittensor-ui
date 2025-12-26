import React, { useState, useEffect, useMemo } from "react";
import { Box, Paper, Typography, CircularProgress, Divider } from "@mui/material";
import axios from "axios";
import FileExplorer, { buildFileTree, FileNode } from "./FileExplorer";
import CodeViewer from "./CodeViewer";

interface RepositoryCodeBrowserProps {
    repositoryFullName: string;
}

const RepositoryCodeBrowser: React.FC<RepositoryCodeBrowserProps> = ({ repositoryFullName }) => {
    const [tree, setTree] = useState<FileNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [defaultBranch, setDefaultBranch] = useState<string>("main");
    const [selectedFile, setSelectedFile] = useState<string | null>(null);

    useEffect(() => {
        const fetchRepoData = async () => {
            setLoading(true);
            try {
                // 1. Get default branch
                const repoResponse = await axios.get(`https://api.github.com/repos/${repositoryFullName}`);
                const branch = repoResponse.data.default_branch || "main";
                setDefaultBranch(branch);

                // 2. Get Tree
                const treeResponse = await axios.get(`https://api.github.com/repos/${repositoryFullName}/git/trees/${branch}?recursive=1`);

                // Build Tree structure
                if (treeResponse.data.tree) {
                    const nodes = buildFileTree(treeResponse.data.tree);
                    setTree(nodes);

                    // Find README to select by default
                    const readme = treeResponse.data.tree.find((f: any) => f.path.toLowerCase() === "readme.md");
                    if (readme) {
                        setSelectedFile(readme.path);
                    }
                }
            } catch (err: any) {
                console.error("Failed to load repository data", err);
                // Handle rate limit specifically optionally
                if (err.response?.status === 403) {
                    setError("GitHub API rate limit exceeded. Please try again later.");
                } else {
                    setError("Failed to load repository structure.");
                }
            } finally {
                setLoading(false);
            }
        };

        if (repositoryFullName) {
            fetchRepoData();
        }
    }, [repositoryFullName]);

    if (loading) {
        return <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Box sx={{ p: 4, color: "error.main", textAlign: "center" }}>{error}</Box>;
    }

    // Breadcrumb path calculation
    const breadcrumbs = selectedFile ? selectedFile.split('/') : [];

    return (
        <Paper
            elevation={0}
            sx={{
                display: "flex",
                height: "calc(100vh - 200px)",
                minHeight: "600px",
                border: "1px solid #30363d",
                borderRadius: "6px",
                overflow: "hidden",
                backgroundColor: "#0d1117"
            }}
        >
            {/* Sidebar */}
            <Box sx={{
                width: "280px",
                minWidth: "220px",
                borderRight: "1px solid #30363d",
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#0d1117"
            }}>
                <Box sx={{
                    p: "12px 16px",
                    borderBottom: "1px solid #30363d",
                    backgroundColor: "#0d1117",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "13px", color: "#c9d1d9" }}>
                        Files
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#8b949e", fontSize: "11px" }}>
                        {defaultBranch}
                    </Typography>
                </Box>
                <Box sx={{ flexGrow: 1, overflowY: "auto", overflowX: "hidden", "&::-webkit-scrollbar": { width: "8px" }, "&::-webkit-scrollbar-thumb": { backgroundColor: "#30363d", borderRadius: "4px" } }}>
                    <FileExplorer files={tree} onSelectFile={setSelectedFile} selectedFile={selectedFile} />
                </Box>
            </Box>

            {/* Main Content */}
            <Box sx={{ flexGrow: 1, overflow: "hidden", display: "flex", flexDirection: "column", backgroundColor: "#0d1117" }}>
                {/* File Header / Breadcrumbs */}
                <Box sx={{
                    height: "45px",
                    borderBottom: "1px solid #30363d",
                    backgroundColor: "#0d1117",
                    display: "flex",
                    alignItems: "center",
                    px: 3
                }}>
                    {selectedFile ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: "13px", color: "#8b949e" }}>
                            {breadcrumbs.map((part, index) => (
                                <React.Fragment key={index}>
                                    <Typography sx={{
                                        fontSize: "13px",
                                        color: index === breadcrumbs.length - 1 ? "#c9d1d9" : "inherit",
                                        fontWeight: index === breadcrumbs.length - 1 ? 600 : 400
                                    }}>
                                        {part}
                                    </Typography>
                                    {index < breadcrumbs.length - 1 && <Typography sx={{ color: "#484f58" }}>/</Typography>}
                                </React.Fragment>
                            ))}
                        </Box>
                    ) : (
                        <Typography sx={{ fontSize: "13px", color: "#8b949e" }}>No file selected</Typography>
                    )}
                </Box>

                <CodeViewer
                    repositoryFullName={repositoryFullName}
                    filePath={selectedFile}
                    defaultBranch={defaultBranch}
                />
            </Box>
        </Paper>
    );
};

export default RepositoryCodeBrowser;
