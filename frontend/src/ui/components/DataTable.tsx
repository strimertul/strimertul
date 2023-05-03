import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';
import React, { ReactElement, useState } from 'react';
import { SortFunction } from '~/lib/types';
import { styled } from '../theme';
import { Table, TableHeader } from '../theme/table';
import PageList from './PageList';

interface SortingOrder<T> {
  key: keyof T;
  order: 'asc' | 'desc';
}

export interface DataTableProps<T> {
  data: T[];
  columns: ({
    title: string;
    attr?: React.HTMLAttributes<HTMLTableCellElement>;
  } & (
    | {
        sortable: true;
        key: Extract<keyof T, string>;
      }
    | {
        sortable: false;
        key: string;
      }
  ))[];
  defaultSort: SortingOrder<T>;
  rowComponent: (data: { data: T }) => ReactElement;
  sort: (key: keyof T) => SortFunction<T>;
}

const Sortable = styled('div', {
  display: 'flex',
  gap: '0.3rem',
  alignItems: 'center',
  cursor: 'pointer',
});

/**
 * DataTable is a component that displays a list of data in a table format with sorting and pagination.
 */
export function DataTable<T>({
  data,
  columns,
  defaultSort,
  sort,
  rowComponent,
}: DataTableProps<T>): React.ReactElement {
  const [entriesPerPage, setEntriesPerPage] = useState(15);
  const [page, setPage] = useState(0);
  const [sorting, setSorting] = useState<SortingOrder<T>>(defaultSort);

  const changeSort = (key: keyof T) => {
    if (sorting.key === key) {
      // Same key, swap sorting order
      setSorting({
        ...sorting,
        order: sorting.order === 'asc' ? 'desc' : 'asc',
      });
    } else {
      // Different key, change to sort that key
      setSorting({ ...sorting, key, order: 'asc' });
    }
  };

  const sortedEntries = data.slice(0);
  const sortFn = sort(sorting.key);
  if (sortFn) {
    sortedEntries.sort((a, b) => {
      const result = sortFn(a, b);
      switch (sorting.order) {
        case 'asc':
          return result;
        case 'desc':
          return -result;
      }
      return 0;
    });
  }

  const offset = page * entriesPerPage;
  const paged = sortedEntries.slice(offset, offset + entriesPerPage);
  const totalPages = Math.floor(sortedEntries.length / entriesPerPage);

  const RowComponent = rowComponent;

  return (
    <>
      <PageList
        current={page + 1}
        min={1}
        max={totalPages + 1}
        itemsPerPage={entriesPerPage}
        onSelectChange={(em) => setEntriesPerPage(em)}
        onPageChange={(p) => setPage(p - 1)}
      />
      <Table>
        <thead>
          <tr>
            {columns.map(({ key, sortable, title, attr }) => (
              <TableHeader {...(attr || {})} key={key}>
                {sortable ? (
                  <Sortable onClick={() => changeSort(key as keyof T)}>
                    {title}
                    {sorting.key === key &&
                      (sorting.order === 'asc' ? (
                        <ChevronUpIcon />
                      ) : (
                        <ChevronDownIcon />
                      ))}
                  </Sortable>
                ) : (
                  title
                )}
              </TableHeader>
            ))}
          </tr>
        </thead>
        <tbody>
          {paged.map((entry) => (
            <RowComponent data={entry} />
          ))}
        </tbody>
      </Table>
      <PageList
        current={page + 1}
        min={1}
        max={totalPages + 1}
        itemsPerPage={entriesPerPage}
        onSelectChange={(em) => setEntriesPerPage(em)}
        onPageChange={(p) => setPage(p - 1)}
      />
    </>
  );
}
