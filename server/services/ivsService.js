const IVS = require('@aws-sdk/client-ivs');

const {
  IvsClient,
  CreateChannelCommand,
  GetChannelCommand,
  ListChannelsCommand,
  DeleteChannelCommand,
  GetStreamCommand,
  ListStreamsCommand,
  GetStreamKeyCommand,
  CreateStreamKeyCommand,
  ListStreamKeysCommand,
  DeleteStreamKeyCommand
} = IVS;

class IVSService {
  constructor() {
    this.ivs = new IvsClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
async getOrCreateChannel(name) {
  try {
    const channels = await this.listChannels();
    let channel, streamKey;

    if (channels.length > 0) {
      channel = await this.getChannel(channels[0].arn);

      // List existing keys
      const keys = await this.listStreamKeys(channel.arn);

      if (keys.length > 0) {
        streamKey = keys[0].value || keys[0].streamKey?.value;
      } else {
        // Cannot create new key due to quota → ask user to create manually
        throw new Error(
          'Stream key not found. AWS Standard channels allow only 1 stream key. Please create it manually in AWS IVS console.'
        );
      }

    } else {
      // No channels → create new channel + key
      const newChannel = await this.createChannel(name);
      channel = {
        arn: newChannel.arn,
        playbackUrl: newChannel.playbackUrl,
        ingestEndpoint: newChannel.ingestEndpoint
      };
      streamKey = newChannel.streamKey;
    }

    return {
      arn: channel.arn,
      playbackUrl: channel.playbackUrl,
      streamKey,
      ingestEndpoint: channel.ingestEndpoint
    };
  } catch (err) {
    console.error('IVS getOrCreateChannel error:', err);
    throw err;
  }
}





async createChannel(name) {
  const params = {
    name,
    type: 'STANDARD',
    authorized: false,
    latencyMode: 'LOW',
    recordingConfigurationArn: process.env.IVS_RECORDING_CONFIG_ARN
  };

  const command = new CreateChannelCommand(params);
  const data = await this.ivs.send(command);

  // Create stream key
  const streamKeyCommand = new CreateStreamKeyCommand({
    channelArn: data.channel.arn
  });
  const streamKeyData = await this.ivs.send(streamKeyCommand);

  return {
    arn: data.channel.arn,
    playbackUrl: data.channel.playbackUrl,
    streamKey: streamKeyData.streamKey.value,
    ingestEndpoint: data.channel.ingestEndpoint
  };
}
  async getChannel(arn) {
    const command = new GetChannelCommand({ arn });
    const data = await this.ivs.send(command);
    return data.channel;
  }

  async listChannels() {
    const command = new ListChannelsCommand({});
    const data = await this.ivs.send(command);
    return data.channels;
  }

  async listStreamKeys(channelArn) {
    const command = new ListStreamKeysCommand({ channelArn });
    const data = await this.ivs.send(command);
    return data.streamKeys;
  }

  async createStreamKey(channelArn) {
    const command = new CreateStreamKeyCommand({ channelArn });
    const data = await this.ivs.send(command);
    return data.streamKey;
  }

  async deleteChannel(arn) {
    const command = new DeleteChannelCommand({ arn });
    await this.ivs.send(command);
    return true;
  }
}

module.exports = new IVSService();
