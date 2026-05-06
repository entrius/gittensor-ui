import React from 'react';
import { Box, Stack, Typography, alpha, useTheme } from '@mui/material';

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => {
  const theme = useTheme();
  return (
    <Box>
      <Typography
        variant="h5"
        sx={{
          mb: 2,
          fontWeight: 600,
          color: theme.palette.text.primary,
        }}
      >
        {title}
      </Typography>
      <Stack
        gap={1.5}
        sx={{
          color: alpha(theme.palette.common.white, 0.8),
          lineHeight: 1.8,
          fontSize: '1rem',
        }}
      >
        {children}
      </Stack>
    </Box>
  );
};

const Bullets: React.FC<{ items: React.ReactNode[] }> = ({ items }) => (
  <Box component="ul" sx={{ pl: 3, m: 0 }}>
    {items.map((item, i) => (
      <Box component="li" key={i} sx={{ mb: 0.75 }}>
        {item}
      </Box>
    ))}
  </Box>
);

const Mention: React.FC<{ name: string }> = ({ name }) => (
  <Box
    component="a"
    href={`https://github.com/${name}`}
    target="_blank"
    rel="noopener noreferrer"
    sx={{ color: 'primary.main', textDecoration: 'none' }}
  >
    @{name}
  </Box>
);

export const CodeOfConductContent: React.FC = () => (
  <Box
    sx={{
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
    }}
  >
    <Stack gap={5} sx={{ width: '100%', maxWidth: '100%' }}>
      <Section title="Pledge">
        <Typography>
          We pledge to make our community welcoming, safe, and equitable for
          all.
        </Typography>
        <Typography>
          We are committed to fostering an environment that respects and
          promotes the dignity, rights, and contributions of all individuals,
          regardless of characteristics including race, ethnicity, caste, color,
          age, physical characteristics, neurodiversity, disability, sex or
          gender, gender identity or expression, sexual orientation, language,
          philosophy or religion, national or social origin, socio-economic
          position, level of education, or other status. The same privileges of
          participation are extended to everyone who participates in good faith
          and in accordance with this Covenant.
        </Typography>
      </Section>

      <Section title="Encouraged Behaviors">
        <Typography>
          While acknowledging differences in social norms, we all strive to meet
          our community&apos;s expectations for positive behavior. We also
          understand that our words and actions may be interpreted differently
          than we intend based on culture, background, or native language.
        </Typography>
        <Typography>
          With these considerations in mind, we agree to behave mindfully toward
          each other and act in ways that center our shared values, including:
        </Typography>
        <Bullets
          items={[
            'Respecting the purpose of our community, our activities, and our ways of gathering.',
            'Engaging kindly and honestly with others.',
            'Respecting different viewpoints and experiences.',
            'Taking responsibility for our actions and contributions.',
            'Gracefully giving and accepting constructive feedback.',
            'Committing to repairing harm when it occurs.',
            'Behaving in other ways that promote and sustain the well-being of our community.',
          ]}
        />
      </Section>

      <Section title="Restricted Behaviors">
        <Typography>
          We agree to restrict the following behaviors in our community.
          Instances, threats, and promotion of these behaviors are violations of
          this Code of Conduct.
        </Typography>
        <Bullets
          items={[
            <>
              <strong>Harassment.</strong> Violating explicitly expressed
              boundaries or engaging in unnecessary personal attention after any
              clear request to stop.
            </>,
            <>
              <strong>Character attacks.</strong> Making insulting, demeaning,
              or pejorative comments directed at a community member or group of
              people.
            </>,
            <>
              <strong>Stereotyping or discrimination.</strong> Characterizing
              anyone&apos;s personality or behavior on the basis of immutable
              identities or traits.
            </>,
            <>
              <strong>Sexualization.</strong> Behaving in a way that would
              generally be considered inappropriately intimate in the context or
              purpose of the community.
            </>,
            <>
              <strong>Violating confidentiality.</strong> Sharing or acting on
              someone&apos;s personal or private information without their
              permission.
            </>,
            <>
              <strong>Endangerment.</strong> Causing, encouraging, or
              threatening violence or other harm toward any person or group.
            </>,
            'Behaving in other ways that threaten the well-being of our community.',
          ]}
        />
      </Section>

      <Section title="Other Restrictions">
        <Bullets
          items={[
            <>
              <strong>Misleading identity.</strong> Impersonating someone else
              for any reason, or pretending to be someone else to evade
              enforcement actions.
            </>,
            <>
              <strong>Failing to credit sources.</strong> Not properly crediting
              the sources of content you contribute.
            </>,
            <>
              <strong>Irresponsible communication.</strong> Failing to
              responsibly present content which includes, links or describes any
              other restricted behaviors.
            </>,
          ]}
        />
      </Section>

      <Section title="Reporting an Issue">
        <Typography>
          Tensions can occur between community members even when they are trying
          their best to collaborate. Not every conflict represents a code of
          conduct violation, and this Code of Conduct reinforces encouraged
          behaviors and norms that can help avoid conflicts and minimize harm.
        </Typography>
        <Typography>
          When an incident does occur, it is important to report it promptly. To
          report a possible violation,{' '}
          <Box
            component="em"
            sx={(theme) => ({ color: theme.palette.text.primary })}
          >
            contact <Mention name="anderdc" /> or <Mention name="landyndev" />{' '}
            directly.
          </Box>
        </Typography>
        <Typography>
          Community Moderators take reports of violations seriously and will
          make every effort to respond in a timely manner. They will investigate
          all reports of code of conduct violations, reviewing messages, logs,
          and recordings, or interviewing witnesses and other participants.
          Community Moderators will keep investigation and enforcement actions
          as transparent as possible while prioritizing safety and
          confidentiality. In order to honor these values, enforcement actions
          are carried out in private with the involved parties, but
          communicating to the whole community may be part of a mutually agreed
          upon resolution.
        </Typography>
      </Section>

      <Section title="Addressing and Repairing Harm">
        <Typography>
          If an investigation by the Community Moderators finds that this Code
          of Conduct has been violated, the following enforcement ladder may be
          used to determine how best to repair harm, based on the
          incident&apos;s impact on the individuals involved and the community
          as a whole. Depending on the severity of a violation, lower rungs on
          the ladder may be skipped.
        </Typography>
        <Bullets
          items={[
            <>
              <strong>Warning</strong>
              <Bullets
                items={[
                  <>
                    <strong>Event:</strong> A violation involving a single
                    incident or series of incidents.
                  </>,
                  <>
                    <strong>Consequence:</strong> A private, written warning
                    from the Community Moderators.
                  </>,
                  <>
                    <strong>Repair:</strong> Examples of repair include a
                    private written apology, acknowledgement of responsibility,
                    and seeking clarification on expectations.
                  </>,
                ]}
              />
            </>,
            <>
              <strong>Temporary Suspension</strong>
              <Bullets
                items={[
                  <>
                    <strong>Event:</strong> A pattern of repeated violation
                    which the Community Moderators have tried to address with
                    warnings, or a single serious violation.
                  </>,
                  <>
                    <strong>Consequence:</strong> A private written warning with
                    conditions for return from suspension. In general, temporary
                    suspensions give the person being suspended time to reflect
                    upon their behavior and possible corrective actions.
                  </>,
                  <>
                    <strong>Repair:</strong> Examples of repair include
                    respecting the spirit of the suspension, meeting the
                    specified conditions for return, and being thoughtful about
                    how to reintegrate with the community when the suspension is
                    lifted.
                  </>,
                ]}
              />
            </>,
            <>
              <strong>Permanent Ban</strong>
              <Bullets
                items={[
                  <>
                    <strong>Event:</strong> A pattern of repeated code of
                    conduct violations that other steps on the ladder have
                    failed to resolve, or a violation so serious that the
                    Community Moderators determine there is no way to keep the
                    community safe with this person as a member.
                  </>,
                  <>
                    <strong>Consequence:</strong> Access to all community
                    spaces, tools, and communication channels is removed. In
                    general, permanent bans should be rarely used, should have
                    strong reasoning behind them, and should only be resorted to
                    if working through other remedies has failed to change the
                    behavior.
                  </>,
                  <>
                    <strong>Repair:</strong> There is no possible repair in
                    cases of this severity.
                  </>,
                ]}
              />
            </>,
          ]}
        />
        <Typography>
          This enforcement ladder is intended as a guideline. It does not limit
          the ability of Community Managers to use their discretion and
          judgment, in keeping with the best interests of our community.
        </Typography>
      </Section>

      <Section title="Scope">
        <Typography>
          This Code of Conduct applies within all community spaces, and also
          applies when an individual is officially representing the community in
          public or other spaces. Examples of representing our community include
          using an official email address, posting via an official social media
          account, or acting as an appointed representative at an online or
          offline event.
        </Typography>
      </Section>
    </Stack>
  </Box>
);
