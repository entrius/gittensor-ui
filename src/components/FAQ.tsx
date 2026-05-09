import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';

export interface FAQProps {
  question: string;
  answer: React.ReactNode;
}

export const FAQ: React.FC<FAQProps> = ({ question, answer }) => (
  <Accordion
    disableGutters
    elevation={0}
    sx={{
      borderRadius: 3,
      backgroundColor: 'surface.transparent',
      border: '1px solid',
      borderColor: 'border.light',
      overflow: 'hidden',
      transition: 'border-color 0.2s ease-in-out',
      '&:before': { display: 'none' },
      '&:hover': { borderColor: 'border.medium' },
    }}
  >
    <AccordionSummary
      expandIcon={<ExpandMore sx={{ color: 'text.secondary' }} />}
      sx={{
        p: 3,
        '& .MuiAccordionSummary-content': { my: 0 },
      }}
    >
      <Typography variant="h6" fontWeight="bold">
        {question}
      </Typography>
    </AccordionSummary>
    <AccordionDetails sx={{ px: 3, pt: 0, pb: 3 }}>
      <Typography variant="body1" lineHeight={1.8} color="text.secondary">
        {answer}
      </Typography>
    </AccordionDetails>
  </Accordion>
);

export default FAQ;
