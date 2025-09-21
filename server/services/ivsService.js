const { IvsClient, 
  CreateChannelCommand,
  GetChannelCommand,
  ListChannelsCommand,
  UpdateChannelCommand,
  DeleteChannelCommand,
  GetStreamCommand,
  ListStreamsCommand,
  GetStreamKeyCommand,
  CreateStreamKeyCommand,
  ListStreamKeysCommand,
  DeleteStreamKeyCommand,
  GetRecordingConfigurationCommand,
  CreateRecordingConfigurationCommand,
  ListRecordingConfigurationsCommand,
  DeleteRecordingConfigurationCommand 
} = require('@aws-sdk/client-ivs');

class IVSService {
  constructor() {
    this.ivs = new IvsClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

async getOrCreateChannel(name) {
  try {
    // First try to list existing channels
    const listCommand = new ListChannelsCommand({});
    const listResponse = await this.ivs.send(listCommand);

    if (listResponse.channels && listResponse.channels.length > 0) {
      const existingChannel = listResponse.channels[0];

      // Get full channel details (this includes ingestEndpoint)
      const getChannelCommand = new GetChannelCommand({
        arn: existingChannel.arn
      });
      const channelDetails = await this.ivs.send(getChannelCommand);

      // Get stream keys for the channel
      const streamKeysCommand = new ListStreamKeysCommand({
        channelArn: existingChannel.arn
      });
      const streamKeysResponse = await this.ivs.send(streamKeysCommand);

      let streamKey;
      if (streamKeysResponse.streamKeys && streamKeysResponse.streamKeys.length > 0) {
        // Get the value of the first stream key
        const getKeyCommand = new GetStreamKeyCommand({
          arn: streamKeysResponse.streamKeys[0].arn
        });
        const keyResponse = await this.ivs.send(getKeyCommand);
        streamKey = keyResponse.streamKey.value;
      } else {
        // Create new stream key if none exists
        const createKeyCommand = new CreateStreamKeyCommand({
          channelArn: existingChannel.arn
        });
        const keyResponse = await this.ivs.send(createKeyCommand);
        streamKey = keyResponse.streamKey.value;
      }

      return {
        arn: channelDetails.channel.arn,
        playbackUrl: channelDetails.channel.playbackUrl,
        streamKey: streamKey,
        ingestEndpoint: channelDetails.channel.ingestEndpoint
      };
    }

    // If no channels exist, create new one
    return await this.createChannel(name);

  } catch (error) {
    console.error('Error getting or creating IVS channel:', error);
    throw error;
  }
}


  async createChannel(name) {
    const params = {
      name: name.substring(0, 128), // IVS channel names have max 128 chars
      type: 'STANDARD',
      authorized: false,
      latencyMode: 'LOW',
      recordingConfigurationArn: process.env.IVS_RECORDING_CONFIG_ARN
    };

    try {
      // Create channel
      const createCommand = new CreateChannelCommand(params);
      const createResponse = await this.ivs.send(createCommand);
      
      // Create stream key for the channel
      const streamKeyCommand = new CreateStreamKeyCommand({
        channelArn: createResponse.channel.arn
      });
      const streamKeyResponse = await this.ivs.send(streamKeyCommand);

      // Get complete channel details to ensure we have all data
      const getChannelCommand = new GetChannelCommand({
        arn: createResponse.channel.arn
      });
      const channelDetails = await this.ivs.send(getChannelCommand);

      return {
        arn: channelDetails.channel.arn,
        playbackUrl: channelDetails.channel.playbackUrl,
        streamKey: streamKeyResponse.streamKey.value,
        ingestEndpoint: channelDetails.channel.ingestEndpoint
      };
    } catch (error) {
      console.error('Error creating IVS channel:', error);
      throw error;
    }
  }

  async getChannel(arn) {
    try {
      const command = new GetChannelCommand({ arn });
      const response = await this.ivs.send(command);
      return response.channel;
    } catch (error) {
      console.error('Error getting IVS channel:', error);
      throw error;
    }
  }

   async getChannelDetails(arn) {
    try {
      const command = new GetChannelCommand({ arn });
      const response = await this.ivs.send(command);
      return response.channel;
    } catch (error) {
      console.error('Error getting IVS channel details:', error);
      throw error;
    }
  }

  async getStreamKey(channelArn) {
    try {
      const streamKeys = await this.listStreamKeys(channelArn);
      if (streamKeys.length > 0) {
        const command = new GetStreamKeyCommand({ arn: streamKeys[0].arn });
        const response = await this.ivs.send(command);
        return response.streamKey;
      }
      return null;
    } catch (error) {
      console.error('Error getting stream key:', error);
      throw error;
    }
  }

  async listStreamKeys(channelArn) {
    try {
      const command = new ListStreamKeysCommand({ channelArn });
      const response = await this.ivs.send(command);
      return response.streamKeys || [];
    } catch (error) {
      console.error('Error listing stream keys:', error);
      throw error;
    }
  }

  async getStream(channelArn) {
    try {
      const command = new GetStreamCommand({ channelArn });
      const response = await this.ivs.send(command);
      return response.stream;
    } catch (error) {
      if (error.name === 'ResourceNotFoundException') {
        return null; // Stream is not live
      }
      console.error('Error getting stream:', error);
      throw error;
    }
  }

  async deleteChannel(arn) {
    try {
      const command = new DeleteChannelCommand({ arn });
      await this.ivs.send(command);
      return true;
    } catch (error) {
      console.error('Error deleting IVS channel:', error);
      throw error;
    }
  }

  // Add this method to check if stream is live
  async isStreamLive(channelArn) {
    try {
      const stream = await this.getStream(channelArn);
      return stream !== null && stream.state === 'LIVE';
    } catch (error) {
      return false;
    }
  }
}

module.exports = new IVSService();