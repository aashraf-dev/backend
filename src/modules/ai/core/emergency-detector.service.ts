import { Injectable } from '@nestjs/common';

/**
 * Fast, deterministic emergency detection using keyword matching.
 * Runs BEFORE the LLM call so we never delay emergency escalation.
 */
@Injectable()
export class EmergencyDetectorService {
  private readonly EMERGENCY_PATTERNS = [
    // Poisoning / toxicity
    /\b(poison|toxic|ate.{0,20}(pill|medication|plant|chemical|bleach|chocolate|grapes?|xylitol|rodenticide))\b/i,
    // Breathing
    /\b(can('t|not)\s+breath|difficult.{0,10}breath|gasping|choking|not\s+breath)\b/i,
    // Bleeding
    /\b(bleed(ing)?|blood.{0,15}(everywhere|profuse|lot|gush)|wound.{0,10}(bad|deep|severe))\b/i,
    // Consciousness
    /\b(unconscious|unresponsive|collapse[sd]?|fainted?|not\s+(waking|moving)|won'?t\s+wake)\b/i,
    // Seizure
    /\b(seiz(ure|ing)|convuls(ion|ing)|tremor.{0,10}(bad|severe|won'?t\s+stop)|shaking\s+uncontrollably)\b/i,
    // Trauma
    /\b(hit\s+by\s+(car|truck|vehicle)|fell\s+(from|off).{0,20}(height|window|balcony|stairs)|broken\s+bone|fractured)\b/i,
    // Obstruction / pain
    /\b(swallow(ed)?.{0,20}(object|toy|bone|sock|string)|can'?t\s+(urinate|pee|poop)|severe\s+pain|screaming\s+in\s+pain)\b/i,
    // Temperature
    /\b(heat\s+(stroke|exhaustion)|hypotherm|froze(n)?|body\s+temp.{0,10}(very\s+)?(high|low))\b/i,
    // Eye / rapid-onset
    /\b(sudden(ly)?\s+(blind|can'?t\s+see)|eye.{0,10}(bulg|pop|came\s+out))\b/i,
  ];

  private readonly URGENCY_WORDS = [
    'emergency',
    'urgent',
    'dying',
    'critical',
    'help me',
    'right now',
    'immediately',
    'please hurry',
  ];

  detect(text: string): {
    isEmergency: boolean;
    confidence: number;
    triggers: string[];
  } {
    const lower = text.toLowerCase();
    const triggers: string[] = [];
    let score = 0;

    // Check emergency patterns
    for (const pattern of this.EMERGENCY_PATTERNS) {
      const match = lower.match(pattern);
      if (match) {
        triggers.push(match[0]);
        score += 0.6;
      }
    }

    // Check urgency intensifiers
    for (const word of this.URGENCY_WORDS) {
      if (lower.includes(word)) {
        score += 0.2;
        triggers.push(word);
      }
    }

    const confidence = Math.min(1, score);
    const isEmergency = confidence >= 0.6;

    return { isEmergency, confidence, triggers };
  }
}
