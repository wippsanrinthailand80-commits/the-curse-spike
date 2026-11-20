import { Skill } from './types.js';

export interface SearchProvider {
  rank(query: string, skills: Skill[], stats: Record<string, any>): Promise<Skill[]>;
}

export class KeywordSearchProvider implements SearchProvider {
  async rank(query: string, skills: Skill[], stats: Record<string, any>): Promise<Skill[]> {
    const q = query.toLowerCase().trim();
    const terms = q.split(/\s+/).filter(Boolean);
    const scored: { skill: Skill; score: number }[] = [];
    for (const s of skills) {
      if (s.status !== 'active') continue;
      const hay = (s.name + ' ' + s.description).toLowerCase();
      let rel = 0;
      for (const t of terms) if (hay.includes(t)) rel += 1;
      if (terms.length > 0 && rel === 0) continue;
      if (terms.length === 0) rel = 1;
      const st = stats[s.name] || { runs: 0, successes: 0, failures: 0 };
      const total = (st.successes || 0) + (st.failures || 0);
      const successRate = total > 0 ? (st.successes || 0) / total : 0.5;
      const usageBoost = Math.log1p(st.runs || 0) * 0.5;
      const score = rel + usageBoost + successRate * 0.5;
      scored.push({ skill: s, score });
    }
    scored.sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name));
    return scored.map(x => x.skill);
  }
}

// Optional Ollama semantic provider (best-effort)
export class OllamaSearchProvider implements SearchProvider {
  constructor(private url: string, private model: string) {}
  private async embed(text: string): Promise<number[] | null> {
    try {
      const res = await fetch(this.url + '/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, prompt: text }),
      });
      if (!res.ok) return null;
      const j: any = await res.json();
      return j.embedding || null;
    } catch { return null; }
  }
  private cosine(a: number[], b: number[]): number {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
    return dot / (Math.sqrt(na)*Math.sqrt(nb) || 1);
  }
  async rank(query: string, skills: Skill[], stats: Record<string, any>): Promise<Skill[]> {
    const qEmb = await this.embed(query);
    if (!qEmb) {
      // fallback
      return new KeywordSearchProvider().rank(query, skills, stats);
    }
    const scored: { skill: Skill; score: number }[] = [];
    for (const s of skills) {
      if (s.status !== 'active') continue;
      const sEmb = await this.embed(s.name + ' ' + s.description);
      if (!sEmb) continue;
      const sim = this.cosine(qEmb, sEmb);
      const st = stats[s.name] || { runs: 0 };
      const usageBoost = Math.log1p(st.runs || 0) * 0.1;
      scored.push({ skill: s, score: sim + usageBoost });
    }
    scored.sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name));
    return scored.map(x => x.skill);
  }
}