import {
  ChatBubbleIcon,
  DiscordLogoIcon,
  EnvelopeClosedIcon,
} from '@radix-ui/react-icons';
import { ChannelList, Channel, ChannelLink } from '~/ui/pages/Strimertul';

export const Channels = (
  <ChannelList>
    <Channel>
      <ChannelLink href="https://lists.sr.ht/~ashkeel/strimertul-devel">
        <ChatBubbleIcon width={24} height={24} />
        lists.sr.ht/~ashkeel/strimertul-devel
      </ChannelLink>
    </Channel>
    <Channel>
      <ChannelLink href="https://nebula.cafe/discord">
        <DiscordLogoIcon width={24} height={24} />
        nebula.cafe/discord
      </ChannelLink>
    </Channel>
    <Channel>
      <ChannelLink href="mailto:strimertul@nebula.cafe">
        <EnvelopeClosedIcon width={24} height={24} />
        strimertul@nebula.cafe
      </ChannelLink>
    </Channel>
  </ChannelList>
);

export default Channels;
