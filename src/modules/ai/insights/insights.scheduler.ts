import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InsightsService } from './insights.service';

@Injectable()
export class InsightsScheduler {
  private readonly logger = new Logger(InsightsScheduler.name);

  constructor(private readonly insightsService: InsightsService) {}

  /** Every night at 23:00 UTC — generate next-day insights */
  @Cron('0 23 * * *', { name: 'nightly-insights' })
  async runNightlyInsights(): Promise<void> {
    this.logger.log('Running nightly AI insights generation');
    await this.insightsService.generateForAllTenants();
  }
}
