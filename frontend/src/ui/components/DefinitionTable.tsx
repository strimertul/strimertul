import React from 'react';
import { styled } from '../theme';

const TableContainer = styled('table', {
  borderRadius: '3px',
  backgroundColor: '$gray2',
  padding: '0.3rem',
  margin: '0.5rem 0',
});

const Term = styled('th', {
  padding: '0.3rem 0.5rem',
  textAlign: 'right',
  color: '$teal11',
});

const Definition = styled('td', {
  padding: '0.3rem 0.5rem',
});

interface DefinitionTableProps {
  entries: Record<string, string>;
}

function DefinitionTable({ entries }: DefinitionTableProps) {
  return (
    <TableContainer>
      <tbody>
        {Object.entries(entries).map(([key, value]) => (
          <tr key={key}>
            <Term>{key}</Term>
            <Definition>{value}</Definition>
          </tr>
        ))}
      </tbody>
    </TableContainer>
  );
}

export default React.memo(DefinitionTable);
