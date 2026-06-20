import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { BlobServiceClient } from '@azure/storage-blob';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

@Injectable()
export class AudioProcessorService {
  private readonly logger = new Logger(AudioProcessorService.name);
  private readonly blobSvc: BlobServiceClient;
  private readonly container: string;

  constructor(private readonly configService: ConfigService) {
    const connStr = this.configService.get<string>(
      'AZURE_STORAGE_CONNECTION_STRING',
    );
    if (connStr) {
      this.blobSvc = BlobServiceClient.fromConnectionString(connStr);
      this.container =
        this.configService.get<string>('AZURE_AUDIO_CONTAINER') ??
        'vetos-audio';
    }
  }

  /**
   * Upload audio/video buffer to Azure Blob Storage.
   * Returns the public URL.
   */
  async uploadAudio(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    tenantSchema: string,
  ): Promise<string> {
    const blobName = `${tenantSchema}/${Date.now()}-${filename}`;
    const client = this.blobSvc
      .getContainerClient(this.container)
      .getBlockBlobClient(blobName);

    await client.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: mimeType },
    });

    this.logger.log(`Audio uploaded: ${blobName}`);
    return client.url;
  }

  /**
   * Download blob from Azure to a local temp file.
   * Returns the local path.
   */
  async downloadToTemp(blobUrl: string): Promise<string> {
    const blobName = blobUrl.split('/').pop()!;
    const client = this.blobSvc
      .getContainerClient(this.container)
      .getBlobClient(blobName);

    const tmpPath = path.join(os.tmpdir(), `vetos-${Date.now()}-${blobName}`);
    await client.downloadToFile(tmpPath);
    return tmpPath;
  }

  /**
   * Extract audio from video using ffmpeg (spawns child process).
   * Returns path to extracted audio file.
   */
  async extractAudioFromVideo(videoPath: string): Promise<string> {
    const audioPath = videoPath.replace(/\.[^.]+$/, '.mp3');

    await new Promise<void>((resolve, reject) => {
      const { spawn } = require('child_process');
      const ffmpeg = spawn('ffmpeg', [
        '-i',
        videoPath,
        '-vn', // no video
        '-acodec',
        'libmp3lame',
        '-ab',
        '128k',
        '-ar',
        '44100',
        '-y', // overwrite
        audioPath,
      ]);

      ffmpeg.on('close', (code: number) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}`));
      });
      ffmpeg.on('error', reject);
    });

    return audioPath;
  }

  /**
   * Compress audio to reduce file size before sending to Deepgram.
   * Target: mono, 16kHz, 64kbps — plenty for speech recognition.
   */
  async compressAudio(inputPath: string): Promise<string> {
    const outputPath = inputPath.replace(/\.[^.]+$/, '_compressed.mp3');

    await new Promise<void>((resolve, reject) => {
      const { spawn } = require('child_process');
      const ffmpeg = spawn('ffmpeg', [
        '-i',
        inputPath,
        '-ac',
        '1', // mono
        '-ar',
        '16000', // 16kHz
        '-acodec',
        'libmp3lame',
        '-ab',
        '64k',
        '-y',
        outputPath,
      ]);
      ffmpeg.on('close', (code: number) =>
        code === 0 ? resolve() : reject(new Error(`ffmpeg code ${code}`)),
      );
      ffmpeg.on('error', reject);
    });

    return outputPath;
  }

  /** Clean up temp files */
  cleanupFiles(...paths: string[]): void {
    for (const p of paths) {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch {}
    }
  }
}
