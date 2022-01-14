import { theme, styled } from './theme';

export const Table = styled('table', {
  borderCollapse: 'collapse',
});

export const TableRow = styled('tr', {
  all: 'unset',
  display: 'table-row',
  padding: '0.5rem',
  verticalAlign: 'middle',
  textAlign: 'left',
  backgroundColor: '$gray1',
  '&:nth-child(even)': {
    backgroundColor: '$gray2',
  },
});

export const TableHeader = styled('th', {
  all: 'unset',
  display: 'table-cell',
  padding: '0.25rem 0.5rem',
  height: '2rem',
  verticalAlign: 'middle',
  textAlign: 'left',
  borderBottom: '3px solid $gray3',
  fontWeight: 'bold',
  color: '$teal11',
});

export const TableCell = styled('td', {
  all: 'unset',
  display: 'table-cell',
  padding: '0.25rem 0.5rem',
  verticalAlign: 'middle',
  textAlign: 'left',
});
