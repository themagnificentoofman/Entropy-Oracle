
import { Injectable } from '@angular/core';
import { GoogleGenAI, Type, SchemaType } from '@google/genai';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env['API_KEY'] || '' });
  }

  async analyzeSequence(sequence: number[]): Promise<any> {
    if (sequence.length < 3) {
      throw new Error("Provide at least 3 numbers for analysis.");
    }

    const prompt = `
      You are a mathematical cryptanalyst and expert in Pseudo-Random Number Generators (PRNGs) and sequence prediction.
      Analyze the following sequence of numbers: [${sequence.join(', ')}].
      
      Task:
      1. Identify the likely algorithm, mathematical pattern, or recurrence relation.
      2. Consider an extensive range of generators and patterns, including but not limited to:
      
         **Linear Congruential & Multiplicative (LCG/MLCG):**
         - Common parameters (ANSI C, glibc, Borland, Microsoft Visual C++, Apple CarbonLib/QuickDraw, Java.util.Random, NAG, Numerical Recipes).
         - Knuth's MMIX, MINSTD (Lehmer), RANDU (IBM), ZX81.
         - Combined LCGs (Wichmann-Hill).
         
         **Shift Register & GF(2) Generators:**
         - Xorshift variants (32, 64, 128, 128+, 1024*).
         - Xoroshiro variants (128+, 128++, 256+, 256++).
         - LFSR (Linear Feedback Shift Register) with various taps and Galois/Fibonacci configurations.
         - WELL (Well Equidistributed Long-period Linear).
         - Tausworthe generators (e.g., Taus88).
         - Mersenne Twister (MT19937, MT19937-64, SFMT).
         
         **Modern Non-Cryptographic:**
         - PCG Family (PCG-XSH-RR, PCG-XSH-RS, PCG-MCG).
         - SplitMix64 (often used to seed others).
         - Mulberry32, SFC32/64 (Small Fast Counting).
         - Tyche, Tyche-i.
         - JSF (Jenkins Small Fast).
         - KISS, JKISS (Marsaglia).
         
         **Chaotic & Dynamical Systems:**
         - Maps: Logistic, Tent, Sine, Circle, Gauss, Hénon, Ikeda, Kaplan-Yorke, Bernoulli.
         - Attractors (sampled coords): Lorenz, Rössler, Chua.
         
         **Cryptographic & Number Theoretic:**
         - ISAAC, RC4 (early keystream), Salsa20/ChaCha (reduced rounds).
         - Blum Blum Shub (BBS).
         - Inverse Congruential Generators.
         - Digits of irrational constants (Pi, e, Phi, Sqrt(2)).
         - Prime sequences, look-and-say, Recamán's sequence.
         
         **Cellular Automata:**
         - Wolfram Rules (Rule 30, Rule 90, Rule 110).
         
         **Quasi-Random (Low Discrepancy):**
         - Halton, Sobol, Van der Corput sequences.

         **Simple Mathematical:**
         - Arithmetic/Geometric progressions.
         - Middle Square Method (von Neumann).
         - Lagged Fibonacci (Add/Sub/Mult).

      3. List up to 3 potential algorithms that could have generated this sequence, ranked by likelihood.
      4. For each candidate, provide a confidence score (0-100), estimated parameters (like multipliers 'a', increments 'c', moduli 'm', seeds, tap masks, or chaos parameters 'r'), and a detailed reasoning explaining the fit.
      5. Predict the next 3 numbers in the sequence based on the #1 most likely candidate. If the pattern is exact, perform the calculation.
    `;

    const schema: SchemaType = {
      type: Type.OBJECT,
      properties: {
        candidates: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              algorithm: { type: Type.STRING, description: "Name of the detected algorithm" },
              confidence: { type: Type.INTEGER, description: "Confidence score (0-100)" },
              parameters: { type: Type.STRING, description: "Estimated parameters (e.g. 'a=1664525' or 'r=3.99')" },
              explanation: { type: Type.STRING, description: "Detailed reasoning for why this algorithm fits the data" }
            },
            required: ["algorithm", "confidence", "explanation"]
          },
          description: "Top 3 potential algorithm matches"
        },
        nextValues: { 
          type: Type.ARRAY, 
          items: { type: Type.NUMBER },
          description: "The next 3 predicted numbers based on the top candidate"
        }
      },
      required: ["candidates", "nextValues"]
    };

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.2
        }
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error('Gemini Analysis Error:', error);
      throw error;
    }
  }
}
