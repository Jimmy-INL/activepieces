import { ColumnDef } from '@tanstack/react-table';
import { t } from 'i18next';
import { CheckIcon, Trash } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAuthorization } from '@/components/authorization';
import { ConfirmationDeleteDialog } from '@/components/delete-dialog';
import { Button } from '@/components/ui/button';
import {
  DataTable,
  PaginationParams,
  RowDataWithActions,
} from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { PermissionNeededWrapper } from '@/components/ui/permission-needed-wrapper';
import { StatusIconWithText } from '@/components/ui/status-icon-with-text';
import { appConnectionsApi } from '@/features/connections/lib/app-connections-api';
import { PieceIcon } from '@/features/pieces/components/piece-icon';
import { piecesHooks } from '@/features/pieces/lib/pieces-hook';
import { authenticationSession } from '@/lib/authentication-session';
import { formatUtils } from '@/lib/utils';
import {
  AppConnection,
  AppConnectionStatus,
  Permission,
} from '@activepieces/shared';

import { appConnectionUtils } from '../../features/connections/lib/app-connections-utils';

import { NewConnectionTypeDialog } from './new-connection-type-dialog';

type PieceIconWithPieceNameProps = {
  pieceName: string;
};
const PieceIconWithPieceName = ({ pieceName }: PieceIconWithPieceNameProps) => {
  const { pieceModel } = piecesHooks.usePiece({
    name: pieceName,
  });

  return (
    <PieceIcon
      circle={true}
      size={'md'}
      border={true}
      displayName={pieceModel?.displayName}
      logoUrl={pieceModel?.logoUrl}
      showTooltip={true}
    />
  );
};

const DeleteConnectionColumn = ({
  row,
}: {
  row: RowDataWithActions<AppConnection>;
}) => {
  const [, setSearchParams] = useSearchParams();
  const { checkAccess } = useAuthorization();
  const userHasPermissionToWriteAppConnection = checkAccess(
    Permission.WRITE_APP_CONNECTION,
  );
  return (
    <div className="flex items-end justify-end">
      <PermissionNeededWrapper
        hasPermission={userHasPermissionToWriteAppConnection}
      >
        <ConfirmationDeleteDialog
          title={t('Delete {name} connection', { name: row.name })}
          message={t(
            'Are you sure you want to delete this connection? all steps using it will fail.',
          )}
          mutationFn={() =>
            appConnectionsApi.delete(row.id).then((data) => {
              const newQueryParameters: URLSearchParams = new URLSearchParams();
              newQueryParameters.set('current', new Date().toISOString());
              setSearchParams(newQueryParameters);
              return data;
            })
          }
          entityName={row.name}
        >
          <Button
            disabled={!userHasPermissionToWriteAppConnection}
            variant="ghost"
            className="size-8 p-0"
          >
            <Trash className="size-4 stroke-destructive" />
          </Button>
        </ConfirmationDeleteDialog>
      </PermissionNeededWrapper>
    </div>
  );
};
const columns: ColumnDef<RowDataWithActions<AppConnection>>[] = [
  {
    accessorKey: 'pieceName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('App')} />
    ),
    cell: ({ row }) => {
      return (
        <div className="text-left">
          <PieceIconWithPieceName pieceName={row.original.pieceName} />
        </div>
      );
    },
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('Name')} />
    ),
    cell: ({ row }) => {
      return <div className="text-left">{row.original.name}</div>;
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('Status')} />
    ),
    cell: ({ row }) => {
      const status = row.original.status;
      const { variant, icon: Icon } = appConnectionUtils.getStatusIcon(status);
      return (
        <div className="text-left">
          <StatusIconWithText
            icon={Icon}
            text={formatUtils.convertEnumToHumanReadable(status)}
            variant={variant}
          />
        </div>
      );
    },
  },
  {
    accessorKey: 'created',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('Created')} />
    ),
    cell: ({ row }) => {
      return (
        <div className="text-left">
          {formatUtils.formatDate(new Date(row.original.created))}
        </div>
      );
    },
  },
  {
    accessorKey: 'updated',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('Updated')} />
    ),
    cell: ({ row }) => {
      return (
        <div className="text-left">
          {formatUtils.formatDate(new Date(row.original.updated))}
        </div>
      );
    },
  },
  {
    accessorKey: 'actions',
    header: ({ column }) => <DataTableColumnHeader column={column} title="" />,
    cell: ({ row }) => {
      return <DeleteConnectionColumn row={row.original} />;
    },
  },
];

const filters = [
  {
    type: 'select',
    title: t('Status'),
    accessorKey: 'status',
    options: Object.values(AppConnectionStatus).map((status) => {
      return {
        label: formatUtils.convertEnumToHumanReadable(status),
        value: status,
      };
    }),
    icon: CheckIcon,
  } as const,
];
const fetchData = async (
  params: { status: AppConnectionStatus[] },
  pagination: PaginationParams,
) => {
  return appConnectionsApi.list({
    projectId: authenticationSession.getProjectId(),
    cursor: pagination.cursor,
    limit: pagination.limit ?? 10,
    status: params.status,
  });
};

function AppConnectionsTable() {
  const [refresh, setRefresh] = useState(0);
  const { checkAccess } = useAuthorization();
  const userHasPermissionToWriteAppConnection = checkAccess(
    Permission.WRITE_APP_CONNECTION,
  );
  return (
    <div className="flex-col w-full">
      <div className="mb-4 flex">
        <h1 className="text-3xl font-bold">{t('Connections')}</h1>
        <div className="ml-auto">
          <PermissionNeededWrapper
            hasPermission={userHasPermissionToWriteAppConnection}
          >
            <NewConnectionTypeDialog
              onConnectionCreated={() => setRefresh(refresh + 1)}
            >
              <Button
                variant="default"
                disabled={!userHasPermissionToWriteAppConnection}
              >
                {t('New Connection')}
              </Button>
            </NewConnectionTypeDialog>
          </PermissionNeededWrapper>
        </div>
      </div>
      <DataTable
        columns={columns}
        fetchData={fetchData}
        refresh={refresh}
        filters={filters}
      />
    </div>
  );
}
export { AppConnectionsTable };
