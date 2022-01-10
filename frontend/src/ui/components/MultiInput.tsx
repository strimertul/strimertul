import { Cross2Icon } from '@radix-ui/react-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, FlexRow, InputBox, Textarea } from '../theme';

export interface MessageArrayProps {
  placeholder?: string;
  value: string[];
  onChange: (value: string[]) => void;
}

function MessageArray({ value, placeholder, onChange }: MessageArrayProps) {
  const { t } = useTranslation();

  return (
    <>
      {value.map((message, index) => (
        <FlexRow key={message + index} css={{ marginTop: '0.5rem', flex: 1 }}>
          <FlexRow border="form" css={{ flex: 1, alignItems: 'stretch' }}>
            <Textarea
              border="none"
              placeholder={placeholder}
              onChange={(ev) => {
                const newMessages = [...value];
                newMessages[index] = ev.target.value;
                onChange(newMessages);
              }}
              className={message !== '' ? 'input' : 'input is-danger'}
              css={
                value.length > 1
                  ? {
                      borderRadius: '$borderRadius$form 0 0 $borderRadius$form',
                      flex: 1,
                    }
                  : { flex: 1 }
              }
            >
              {message}
            </Textarea>
            {value.length > 1 && (
              <Button
                type="button"
                variation="danger"
                styling="form"
                onClick={() => {
                  const newMessages = [...value];
                  newMessages.splice(index, 1);
                  onChange(newMessages.length > 0 ? newMessages : ['']);
                }}
                css={{
                  margin: '-1px',
                  borderRadius: '0 $borderRadius$form $borderRadius$form 0',
                }}
              >
                <Cross2Icon />
              </Button>
            )}
          </FlexRow>
        </FlexRow>
      ))}
      <FlexRow align="left">
        <Button
          size="small"
          styling="link"
          type="button"
          css={{ marginTop: '0.5rem' }}
          onClick={() => {
            onChange([...value, '']);
          }}
        >
          {t('form-actions.add')}
        </Button>
      </FlexRow>
    </>
  );
}

export default React.memo(MessageArray);
