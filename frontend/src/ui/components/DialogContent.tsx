import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Cross2Icon } from '@radix-ui/react-icons';
import {
  DialogOverlay,
  DialogContainer,
  IconButton,
  DialogTitle,
  DialogDescription,
} from '../theme';

export interface DialogProps {
  title?: string;
  description?: string;
  closeButton?: boolean;
}

function DialogContent({
  title,
  description,
  children,
  closeButton,
}: React.PropsWithChildren<DialogProps>) {
  return (
    <DialogPrimitive.Portal
      container={document.getElementById('app-container')}
    >
      <DialogOverlay />
      <DialogContainer>
        {title && (
          <DialogTitle>
            {title}

            {closeButton && (
              <DialogPrimitive.DialogClose asChild>
                <IconButton>
                  <Cross2Icon />
                </IconButton>
              </DialogPrimitive.DialogClose>
            )}
          </DialogTitle>
        )}
        {description && <DialogDescription>{description}</DialogDescription>}
        {children}
      </DialogContainer>
    </DialogPrimitive.Portal>
  );
}

const PureDialogContent = React.memo(DialogContent);
export default PureDialogContent;
