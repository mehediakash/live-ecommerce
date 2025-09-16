const IVS = require('@aws-sdk/client-ivs');


const {
  IvsClient,
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
  DeleteRecordingConfigurationCommand,
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

  async createChannel(name) {
    const params = {
      name,
      type: 'STANDARD', // or 'BASIC'
      authorized: false,
      latencyMode: 'LOW', // or 'NORMAL'
      recordingConfigurationArn: process.env.IVS_RECORDING_CONFIG_ARN // optional
    };

    try {
      const command = new CreateChannelCommand(params);
      const data = await this.ivs.send(command);
      
      // For CreateChannel, we also need to get the stream key
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
    } catch (error) {
      console.error('Error creating IVS channel:', error);
      throw error;
    }
  }

  async getChannel(arn) {
    try {
      const command = new GetChannelCommand({ arn });
      const data = await this.ivs.send(command);
      return data.channel;
    } catch (error) {
      console.error('Error getting IVS channel:', error);
      throw error;
    }
  }

  async listChannels() {
    try {
      const command = new ListChannelsCommand({});
      const data = await this.ivs.send(command);
      return data.channels;
    } catch (error) {
      console.error('Error listing IVS channels:', error);
      throw error;
    }
  }

  async updateChannel(arn, name) {
    const params = {
      arn,
      name
    };

    try {
      const command = new UpdateChannelCommand(params);
      const data = await this.ivs.send(command);
      return data.channel;
    } catch (error) {
      console.error('Error updating IVS channel:', error);
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

  async getStream(channelArn) {
    try {
      const command = new GetStreamCommand({ channelArn });
      const data = await this.ivs.send(command);
      return data.stream;
    } catch (error) {
      if (error.name === 'ResourceNotFoundException') {
        return null; // Stream is not live
      }
      console.error('Error getting stream:', error);
      throw error;
    }
  }

  async listStreams() {
    try {
      const command = new ListStreamsCommand({});
      const data = await this.ivs.send(command);
      return data.streams;
    } catch (error) {
      console.error('Error listing streams:', error);
      throw error;
    }
  }

  async getStreamKey(arn) {
    try {
      const command = new GetStreamKeyCommand({ arn });
      const data = await this.ivs.send(command);
      return data.streamKey;
    } catch (error) {
      console.error('Error getting stream key:', error);
      throw error;
    }
  }

  async createStreamKey(channelArn) {
    try {
      const command = new CreateStreamKeyCommand({ channelArn });
      const data = await this.ivs.send(command);
      return data.streamKey;
    } catch (error) {
      console.error('Error creating stream key:', error);
      throw error;
    }
  }

  async listStreamKeys(channelArn) {
    try {
      const command = new ListStreamKeysCommand({ channelArn });
      const data = await this.ivs.send(command);
      return data.streamKeys;
    } catch (error) {
      console.error('Error listing stream keys:', error);
      throw error;
    }
  }

  async deleteStreamKey(arn) {
    try {
      const command = new DeleteStreamKeyCommand({ arn });
      await this.ivs.send(command);
      return true;
    } catch (error) {
      console.error('Error deleting stream key:', error);
      throw error;
    }
  }

  async getRecordingConfiguration(arn) {
    try {
      const command = new GetRecordingConfigurationCommand({ arn });
      const data = await this.ivs.send(command);
      return data.recordingConfiguration;
    } catch (error) {
      console.error('Error getting recording configuration:', error);
      throw error;
    }
  }

  async createRecordingConfiguration(name, destinationConfiguration) {
    const params = {
      name,
      destinationConfiguration
    };

    try {
      const command = new CreateRecordingConfigurationCommand(params);
      const data = await this.ivs.send(command);
      return data.recordingConfiguration;
    } catch (error) {
      console.error('Error creating recording configuration:', error);
      throw error;
    }
  }

  async listRecordingConfigurations() {
    try {
      const command = new ListRecordingConfigurationsCommand({});
      const data = await this.ivs.send(command);
      return data.recordingConfigurations;
    } catch (error) {
      console.error('Error listing recording configurations:', error);
      throw error;
    }
  }

  async deleteRecordingConfiguration(arn) {
    try {
      const command = new DeleteRecordingConfigurationCommand({ arn });
      await this.ivs.send(command);
      return true;
    } catch (error) {
      console.error('Error deleting recording configuration:', error);
      throw error;
    }
  }
}

module.exports = new IVSService();