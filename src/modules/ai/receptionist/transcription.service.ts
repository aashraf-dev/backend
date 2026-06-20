import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@deepgram/sdk';

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);
  private readonly deepgram: ReturnType<typeof createClient>;

  constructor(private readonly configService: ConfigService) {
    const key = this.configService.get<string>('DEEPGRAM_API_KEY');
    if (key) this.deepgram = createClient(key);
  }

  /**
   * Transcribe a Twilio recording URL in near-real-time.
   * Twilio recordings are available as .mp3 via HTTPS.
   */
  async transcribeRecordingUrl(recordingUrl: string): Promise<string> {
    if (!this.deepgram) {
      this.logger.warn('Deepgram not configured — returning empty transcript');
      return '';
    }

    try {
      const { result } = await this.deepgram.listen.prerecorded.transcribeUrl(
        { url: recordingUrl },
        {
          model: this.configService.get<string>('DEEPGRAM_MODEL') ?? 'nova-2',
          smart_format: true,
          punctuate: true,
          language: 'en-US',
        },
      );

      return (
        result?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ''
      );
    } catch (err) {
      this.logger.error(`Transcription error: ${(err as Error).message}`);
      return '';
    }
  }
}
