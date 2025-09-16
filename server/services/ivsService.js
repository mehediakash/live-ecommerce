const AWS = require('aws-sdk');

class IVSService {
  constructor() {
    this.ivs = new AWS.IVS({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION
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
      const data = await this.ivs.createChannel(params).promise();
      return {
        arn: data.channel.arn,
        playbackUrl: data.channel.playbackUrl,
        streamKey: data.streamKey.value,
        ingestEndpoint: data.channel.ingestEndpoint
      };
    } catch (error) {
      console.error('Error creating IVS channel:', error);
      throw error;
    }
  }

  async getChannel(arn) {
    try {
      const data = await this.ivs.getChannel({ arn }).promise();
      return data.channel;
    } catch (error) {
      console.error('Error getting IVS channel:', error);
      throw error;
    }
  }

  async listChannels() {
    try {
      const data = await this.ivs.listChannels({}).promise();
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
      const data = await this.ivs.updateChannel(params).promise();
      return data.channel;
    } catch (error) {
      console.error('Error updating IVS channel:', error);
      throw error;
    }
  }

  async deleteChannel(arn) {
    try {
      await this.ivs.deleteChannel({ arn }).promise();
      return true;
    } catch (error) {
      console.error('Error deleting IVS channel:', error);
      throw error;
    }
  }

  async getStream(channelArn) {
    try {
      const data = await this.ivs.getStream({ channelArn }).promise();
      return data.stream;
    } catch (error) {
      if (error.code === 'ResourceNotFoundException') {
        return null; // Stream is not live
      }
      console.error('Error getting stream:', error);
      throw error;
    }
  }

  async listStreams() {
    try {
      const data = await this.ivs.listStreams({}).promise();
      return data.streams;
    } catch (error) {
      console.error('Error listing streams:', error);
      throw error;
    }
  }

  async getStreamKey(arn) {
    try {
      const data = await this.ivs.getStreamKey({ arn }).promise();
      return data.streamKey;
    } catch (error) {
      console.error('Error getting stream key:', error);
      throw error;
    }
  }

  async createStreamKey(channelArn) {
    try {
      const data = await this.ivs.createStreamKey({ channelArn }).promise();
      return data.streamKey;
    } catch (error) {
      console.error('Error creating stream key:', error);
      throw error;
    }
  }

  async listStreamKeys(channelArn) {
    try {
      const data = await this.ivs.listStreamKeys({ channelArn }).promise();
      return data.streamKeys;
    } catch (error) {
      console.error('Error listing stream keys:', error);
      throw error;
    }
  }

  async deleteStreamKey(arn) {
    try {
      await this.ivs.deleteStreamKey({ arn }).promise();
      return true;
    } catch (error) {
      console.error('Error deleting stream key:', error);
      throw error;
    }
  }

  async getRecordingConfiguration(arn) {
    try {
      const data = await this.ivs.getRecordingConfiguration({ arn }).promise();
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
      const data = await this.ivs.createRecordingConfiguration(params).promise();
      return data.recordingConfiguration;
    } catch (error) {
      console.error('Error creating recording configuration:', error);
      throw error;
    }
  }

  async listRecordingConfigurations() {
    try {
      const data = await this.ivs.listRecordingConfigurations({}).promise();
      return data.recordingConfigurations;
    } catch (error) {
      console.error('Error listing recording configurations:', error);
      throw error;
    }
  }

  async deleteRecordingConfiguration(arn) {
    try {
      await this.ivs.deleteRecordingConfiguration({ arn }).promise();
      return true;
    } catch (error) {
      console.error('Error deleting recording configuration:', error);
      throw error;
    }
  }
}

module.exports = new IVSService();