import React, { useState, useEffect } from "react";
import { Box, Card, Typography, CircularProgress, Alert } from "@mui/material";
import axios from "axios";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from "react-markdown";

interface CodeViewerProps {
    repositoryFullName: string;
    filePath: string | null;
    defaultBranch?: string;
}

const CodeViewer: React.FC<CodeViewerProps> = ({ repositoryFullName, filePath, defaultBranch = "main" }) => {
    const [content, setContent] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchContent = async () => {
            if (!filePath) {
                setContent(null);
                return;
            }

            setLoading(true);
            setError(null);
            try {
                // Use raw.githubusercontent.com
                const url = `https://raw.githubusercontent.com/${repositoryFullName}/${defaultBranch}/${filePath}`;
                const response = await axios.get(url, { transformResponse: [(data) => data] }); // Force text
                setContent(response.data);
            } catch (err) {
                console.error("Failed to fetch file content", err);
                setError("Could not load file content. It might be binary or too large.");
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, [repositoryFullName, filePath, defaultBranch]);

    if (!filePath) {
        return (
            <Box sx={{ p: 4, display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "text.secondary" }}>
                <Typography>Select a file to view code</Typography>
            </Box>
        );
    }

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ m: 2 }}>
                {error}
            </Alert>
        );
    }

    const extension = filePath.split('.').pop()?.toLowerCase();

    // Special rendering for markdown
    if (extension === 'md') {
        return (
            <Box sx={{
                p: 3,
                height: "100%",
                overflow: "auto",
                "& img": { maxWidth: "100%" },
                "& pre": { backgroundColor: "#1e1e1e", p: 2, borderRadius: 1, overflowX: "auto" },
                "& code": { fontFamily: "monospace", backgroundColor: "rgba(255,255,255,0.1)", px: 0.5, borderRadius: 0.5 },
                "& h1, & h2, & h3": { color: "#fff", borderBottom: "1px solid #30363d", pb: 1 },
                color: "#c9d1d9",
                lineHeight: 1.6
            }}>
                <ReactMarkdown>{content || ""}</ReactMarkdown>
            </Box>
        )
    }

    return (
        <Box sx={{
            height: "100%",
            width: "100%",
            overflow: "auto",
            backgroundColor: "#1e1e1e",
            fontSize: "14px"
        }}>
            <SyntaxHighlighter
                language={extension || 'text'}
                style={vscDarkPlus}
                customStyle={{ margin: 0, padding: '1.5rem', minHeight: '100%', backgroundColor: 'transparent' }}
                showLineNumbers={true}
            >
                {content || ""}
            </SyntaxHighlighter>
        </Box>
    );
};

export default CodeViewer;
