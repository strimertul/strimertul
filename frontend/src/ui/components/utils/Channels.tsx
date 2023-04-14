import {
  DiscordLogoIcon,
  EnvelopeClosedIcon,
  GitHubLogoIcon,
} from '@radix-ui/react-icons';
import { ChannelList, Channel, ChannelLink } from '../../pages/Strimertul';

export const Channels = (
  <ChannelList>
    <Channel>
      <ChannelLink href="https://github.com/strimertul/strimertul/issues">
        <GitHubLogoIcon width={24} height={24} />
        github.com/strimertul/strimertul/issues
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
