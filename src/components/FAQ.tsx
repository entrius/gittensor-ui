import React, { useState } from 'react';
import { Box, Collapse, Stack, Typography, useTheme } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';

export interface FAQProps {
  question: string;
  answer: React.ReactNode;
}

export const FAQ: React.FC<FAQProps> = ({ question, answer }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 3,
        backgroundColor: 'transparent',
        border: `1px solid ${theme.palette.border.light}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: theme.palette.border.medium,
        },
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: expanded ? 1.5 : 0 }}
      >
        <Typography variant="h6" fontWeight="bold">
          {question}
        </Typography>
        <ExpandMore
          sx={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease-in-out',
            color: 'text.secondary',
          }}
        />
      </Stack>
      <Collapse in={expanded}>
        <Typography variant="body1" lineHeight={1.8} color="text.secondary">
          {answer}
        </Typography>
      </Collapse>
    </Box>
  );
};

export default FAQ;
