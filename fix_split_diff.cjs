const fs = require('fs');
const content = fs.readFileSync('src/components/prs/PRFilesChanged.tsx', 'utf8');
const lines = content.split('\n');

// Keep 0-304 (0-indexed, so 305 lines) -> indices 0 to 304
const part1 = lines.slice(0, 305);

// Keep 631 onwards (631 is index of line 632)
// Line 631 in 1-indexed is index 630.
// Line 632 in 1-indexed is index 631.
const part3 = lines.slice(631);

const part2 = `// Split View Component
const SplitDiffView: React.FC<{ patch: string; lineWrap: boolean }> = ({ patch, lineWrap }) => {
    const files = useMemo(() => parseDiff(patch), [patch]);

    // Scroll Synchronization Refs
    const leftRef = useRef<HTMLDivElement>(null);
    const rightRef = useRef<HTMLDivElement>(null);
    const isSyncingLeftScroll = useRef(false);
    const isSyncingRightScroll = useRef(false);

    if (!files || files.length === 0) return null;

    const rows: unknown[] = []; 

    files[0].chunks.forEach((chunk: any) => {
        rows.push({
            left: null,
            right: null,
            type: "chunk-header",
            headerContent: chunk.content,
        });

        let deletions: any[] = [];
        let additions: any[] = [];

        chunk.changes.forEach((change: any) => {
            if (change.type === "normal") {
                const maxLen = Math.max(deletions.length, additions.length);
                for (let i = 0; i < maxLen; i++) {
                    rows.push({
                        left: deletions[i] || null,
                        right: additions[i] || null,
                        type: "modify",
                    });
                }
                deletions = [];
                additions = [];
                rows.push({ left: change, right: change, type: "normal" });
            } else if (change.type === "del") {
                deletions.push(change);
            } else if (change.type === "add") {
                additions.push(change);
            }
        });

        const maxLen = Math.max(deletions.length, additions.length);
        for (let i = 0; i < maxLen; i++) {
            rows.push({
                left: deletions[i] || null,
                right: additions[i] || null,
                type: "modify",
            });
        }
    });

    // If Line Wrap is enabled, use a single table layout
    if (lineWrap) {
        return (
            <TableContainer
                className="split-diff-table"
                sx={{
                    overflowX: "auto",
                    backgroundColor: "#0d1117",
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: "12px",
                }}
            >
                <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
                    <colgroup>
                        <col style={{ width: "50px" }} />
                        <col style={{ width: "50%" }} />
                        <col style={{ width: "50px" }} />
                        <col style={{ width: "50%" }} />
                    </colgroup>
                    <TableBody>
                        {rows.map((row: any, idx) => {
                            if (row.type === 'chunk-header') {
                                return (
                                    <TableRow key={idx} sx={{ backgroundColor: "#1c2128" }}>
                                        <TableCell
                                            colSpan={4}
                                            sx={{
                                                color: "#8b949e",
                                                borderBottom: "1px solid #30363d",
                                                py: 1,
                                                px: 2,
                                                fontFamily: "inherit",
                                                fontSize: "12px",
                                            }}
                                        >
                                            {row.headerContent}
                                        </TableCell>
                                    </TableRow>
                                );
                            }

                            return (
                                <TableRow key={idx}>
                                    <TableCell
                                        sx={{
                                            color: "#6e7681",
                                            borderRight: "1px solid #30363d",
                                            borderBottom: "none",
                                            textAlign: "right",
                                            verticalAlign: "top",
                                            backgroundColor: row.left?.type === "del" ? "rgba(248,81,73,0.15)" : "transparent",
                                            userSelect: "none",
                                            p: "4px 8px",
                                            fontFamily: "inherit",
                                            lineHeight: 1.5
                                        }}
                                    >
                                        {row.left ? (row.left.type === 'normal' ? row.left.ln1 : row.left.ln) : ''}
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            borderRight: "1px solid #30363d",
                                            borderBottom: "none",
                                            verticalAlign: "top",
                                            backgroundColor: row.left?.type === "del" ? "rgba(248,81,73,0.15)" : "transparent",
                                            color: "#e6edf3",
                                            whiteSpace: "pre-wrap",
                                            wordBreak: "break-all",
                                            p: "4px 8px",
                                            fontFamily: "inherit",
                                            lineHeight: 1.5
                                        }}
                                    >
                                        {row.left ? (row.left.content.startsWith('-') || row.left.content.startsWith('+') ? row.left.content.substring(1) : row.left.content) : ''}
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            color: "#6e7681",
                                            borderRight: "1px solid #30363d",
                                            borderBottom: "none",
                                            textAlign: "right",
                                            verticalAlign: "top",
                                            backgroundColor: row.right?.type === "add" ? "rgba(46,160,67,0.15)" : "transparent",
                                            userSelect: "none",
                                            p: "4px 8px",
                                            fontFamily: "inherit",
                                            lineHeight: 1.5
                                        }}
                                    >
                                        {row.right ? (row.right.type === 'normal' ? row.right.ln2 : row.right.ln) : ''}
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            borderBottom: "none",
                                            verticalAlign: "top",
                                            backgroundColor: row.right?.type === "add" ? "rgba(46,160,67,0.15)" : "transparent",
                                            color: "#e6edf3",
                                            whiteSpace: "pre-wrap",
                                            wordBreak: "break-all",
                                            p: "4px 8px",
                                            fontFamily: "inherit",
                                            lineHeight: 1.5
                                        }}
                                    >
                                        {row.right ? (row.right.content.startsWith('+') || row.right.content.startsWith('-') ? row.right.content.substring(1) : row.right.content) : ''}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    }

    const handleScroll = (side: 'left' | 'right') => {
        const source = side === 'left' ? leftRef.current : rightRef.current;
        const target = side === 'left' ? rightRef.current : leftRef.current;
        const isSyncingSource = side === 'left' ? isSyncingLeftScroll : isSyncingRightScroll;
        const isSyncingTarget = side === 'left' ? isSyncingRightScroll : isSyncingLeftScroll;

        if (!source || !target) return;

        if (isSyncingSource.current) {
            isSyncingSource.current = false;
            return;
        }

        isSyncingTarget.current = true;
        target.scrollLeft = source.scrollLeft;
    };

    const renderPane = (side: 'left' | 'right') => (
        <Box
            ref={side === 'left' ? leftRef : rightRef}
            onScroll={() => handleScroll(side)}
            sx={{
                width: '50%',
                overflowX: 'auto',
                borderRight: side === 'left' ? '1px solid #30363d' : 'none',
                '&::-webkit-scrollbar': { height: '8px' }, 
                '&::-webkit-scrollbar-thumb': { backgroundColor: '#30363d', borderRadius: '4px' }
            }}>
            <Table size="small" sx={{
                width: '100%',
                minWidth: 'max-content',
                tableLayout: 'auto'
            }}>
                <TableBody>
                    {rows.map((row: any, idx) => {
                        if (row.type === 'chunk-header') {
                            return (
                                <TableRow key={idx} sx={{ height: '24px', backgroundColor: "#1c2128" }}>
                                    <TableCell
                                        sx={{
                                            position: 'sticky',
                                            left: 0,
                                            width: '50px',
                                            minWidth: '50px',
                                            backgroundColor: '#1c2128',
                                            borderBottom: "1px solid #30363d",
                                            borderRight: "1px solid #30363d",
                                            p: '4px 8px',
                                            color: "#8b949e",
                                            fontFamily: "inherit",
                                            fontSize: "12px",
                                            zIndex: 2
                                        }}
                                    >
                                        ...
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            color: "#8b949e",
                                            borderBottom: "1px solid #30363d",
                                            p: '4px 8px',
                                            fontFamily: "inherit",
                                            fontSize: "12px",
                                            whiteSpace: 'pre'
                                        }}
                                    >
                                        {row.headerContent}
                                    </TableCell>
                                </TableRow>
                            );
                        }

                        const item = side === 'left' ? row.left : row.right;
                        const ln = item ? (item.type === 'normal' ? (side === 'left' ? item.ln1 : item.ln2) : item.ln) : '';

                        let bg = "transparent";
                        if (item && item.type === "add") bg = "rgba(46, 160, 67, 0.15)";
                        if (item && item.type === "del") bg = "rgba(248, 81, 73, 0.15)";

                        return (
                            <TableRow key={idx} sx={{ height: '24px' }}>
                                <TableCell
                                    sx={{
                                        position: 'sticky',
                                        left: 0,
                                        width: '50px',
                                        minWidth: '50px',
                                        backgroundColor: bg === "transparent" ? '#0d1117' : bg,
                                        color: "#6e7681",
                                        borderRight: "1px solid #30363d",
                                        borderBottom: "none",
                                        textAlign: "right",
                                        verticalAlign: "top",
                                        userSelect: "none",
                                        p: "0 8px",
                                        fontFamily: "inherit",
                                        fontSize: "12px",
                                        lineHeight: "24px",
                                        zIndex: 2
                                    }}
                                >
                                    {ln}
                                </TableCell>
                                <TableCell
                                    sx={{
                                        backgroundColor: bg,
                                        color: "#e6edf3",
                                        borderBottom: "none",
                                        verticalAlign: "top",
                                        whiteSpace: "pre", 
                                        p: "0 8px",
                                        fontFamily: "inherit",
                                        fontSize: "12px",
                                        lineHeight: "24px",
                                        width: 'auto'
                                    }}
                                >
                                    {item ? (item.content.startsWith('+') || item.content.startsWith('-') ? item.content.substring(1) : item.content) : ''}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </Box>
    );

    return (
        <Box
            className="split-diff-container"
            sx={{
                display: 'flex',
                width: '100%',
                backgroundColor: "#0d1117",
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "12px",
            }}
        >
            {renderPane('left')}
            {renderPane('right')}
        </Box>
    );
};
`;

const newContent = part1.join('\n') + '\n' + part2 + '\n' + part3.join('\n');
fs.writeFileSync('src/components/prs/PRFilesChanged.tsx', newContent);
console.log('File rewritten successfully.');
