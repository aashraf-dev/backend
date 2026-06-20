import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeepgramClient } from '@deepgram/sdk';
import type { ListenV1Response } from '@deepgram/sdk';

/** Type guard — narrows MediaTranscribeResponse to the synchronous result type */
function isSyncResponse(r: unknown): r is ListenV1Response {
  return typeof r === 'object' && r !== null && 'results' in r;
}

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);
  private readonly deepgram: DeepgramClient | null = null;

  constructor(private readonly configService: ConfigService) {
    const key = this.configService.get<string>('DEEPGRAM_API_KEY');
    if (key) {
      this.deepgram = new DeepgramClient({ apiKey: key });
    }
  }

  /**
   * Transcribe a Twilio recording URL.
   * Uses synchronous pre-recorded transcription (no callback URL set),
   * so the response is always ListenV1Response (has `results`).
   */
  async transcribeRecordingUrl(recordingUrl: string): Promise<string> {
    if (!this.deepgram) {
      this.logger.warn('Deepgram not configured — returning empty transcript');
      return '';
    }

    try {
      const response = await this.deepgram.listen.v1.media.transcribeUrl({
        url: recordingUrl,
        model: this.configService.get<string>('DEEPGRAM_MODEL') ?? 'nova-2',
        smart_format: true,
        punctuate: true,
        language: 'en-US',
      });

      if (!isSyncResponse(response)) {
        this.logger.warn(
          'Deepgram returned async accepted response unexpectedly',
        );
        return '';
      }

      return (
        response.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ''
      );
    } catch (err) {
      this.logger.error(`Transcription error: ${(err as Error).message}`);
      return '';
    }
  }
}
