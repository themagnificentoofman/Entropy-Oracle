
import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../services/gemini.service';

@Component({
  selector: 'app-analyzer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Input Section -->
      <div class="glass-panel p-6 rounded-xl border-l-4 border-cyan-500 shadow-lg">
        <h2 class="text-xl font-bold text-white mb-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Sequence Input
        </h2>
        
        <p class="text-slate-400 mb-4 text-sm">
          Enter a sequence of numbers separated by commas. The AI will attempt to reverse-engineer the generator.
        </p>

        <div class="flex gap-2 mb-4">
          <input 
            type="text" 
            [(ngModel)]="inputSequence" 
            (keyup.enter)="analyze()"
            placeholder="e.g., 3, 10, 31, 94..." 
            class="flex-1 bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-cyan-500 font-mono transition-colors"
          />
          <button 
            (click)="analyze()" 
            [disabled]="isLoading()"
            class="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg shadow-cyan-900/20">
            @if (isLoading()) {
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Cracking...
            } @else {
              Analyze
            }
          </button>
        </div>

        <div class="flex gap-2">
           <button (click)="loadDemo('lcg')" class="text-xs bg-slate-700 hover:bg-slate-600 text-cyan-300 px-3 py-1 rounded transition-colors">
             Load LCG Demo
           </button>
           <button (click)="loadDemo('fib')" class="text-xs bg-slate-700 hover:bg-slate-600 text-cyan-300 px-3 py-1 rounded transition-colors">
             Load Fibonacci Demo
           </button>
        </div>
        
        @if (error()) {
          <div class="mt-4 p-3 bg-red-900/30 border border-red-800 text-red-300 rounded text-sm">
            {{ error() }}
          </div>
        }
      </div>

      <!-- Results Section -->
      @if (result(); as res) {
        <div class="glass-panel p-6 rounded-xl border-t border-slate-700 animation-fade-in">
          
          <div class="flex justify-between items-center mb-6">
             <h3 class="text-2xl font-bold text-white">Analysis Report</h3>
             <span class="text-xs text-slate-500 border border-slate-700 px-2 py-1 rounded">Model: Gemini 2.5 Flash</span>
          </div>

          <!-- Top Candidates Grid -->
           <h4 class="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Detected Algorithms</h4>
          <div class="grid grid-cols-1 gap-4 mb-6">
             @for (candidate of res.candidates; track $index) {
                <div class="bg-slate-800/50 p-4 rounded-lg border" 
                     [class.border-emerald-500]="candidate.confidence >= 80"
                     [class.border-yellow-500]="candidate.confidence >= 50 && candidate.confidence < 80"
                     [class.border-slate-600]="candidate.confidence < 50">
                  <div class="flex justify-between items-start mb-2">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-mono text-lg font-bold text-white">{{ candidate.algorithm }}</span>
                        @if ($index === 0) {
                          <span class="bg-emerald-900/50 text-emerald-400 text-xs px-2 py-0.5 rounded uppercase font-bold">Best Match</span>
                        }
                      </div>
                      <p class="font-mono text-xs text-slate-400 mt-1">{{ candidate.parameters || 'No parameters detected' }}</p>
                    </div>
                    <div class="flex flex-col items-end">
                       <span class="text-2xl font-bold font-mono" 
                             [class.text-emerald-400]="candidate.confidence >= 80"
                             [class.text-yellow-400]="candidate.confidence >= 50 && candidate.confidence < 80"
                             [class.text-slate-400]="candidate.confidence < 50">
                         {{ candidate.confidence }}%
                       </span>
                       <span class="text-xs text-slate-500 uppercase">Confidence</span>
                    </div>
                  </div>
                  <p class="text-sm text-slate-300 border-t border-slate-700/50 pt-2 mt-2 leading-relaxed">
                    {{ candidate.explanation }}
                  </p>
                </div>
             }
          </div>

          <!-- Predicted Values based on Top Candidate -->
          <div class="bg-slate-900/50 p-6 rounded-lg border border-slate-800">
            <h4 class="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-4 flex items-center">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
              Predicted Next Sequence
            </h4>
            <div class="flex gap-4">
              @for (val of res.nextValues; track $index) {
                <div class="bg-slate-950 border border-cyan-900 text-cyan-300 font-mono text-2xl py-4 px-6 rounded-lg shadow-lg flex-1 text-center relative overflow-hidden group">
                    <span class="relative z-10">{{ val }}</span>
                    <div class="absolute top-0 right-0 p-1">
                      <span class="text-[10px] text-slate-600">n+{{$index + 1}}</span>
                    </div>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .animation-fade-in {
      animation: fadeIn 0.5s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class AnalyzerComponent {
  private gemini = inject(GeminiService);
  
  inputSequence = signal('');
  result = signal<any>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  async analyze() {
    const rawInput = this.inputSequence().trim();
    if (!rawInput) return;

    // Parse Input
    const sequence = rawInput.split(',')
      .map(s => parseFloat(s.trim()))
      .filter(n => !isNaN(n));

    if (sequence.length < 3) {
      this.error.set("Please enter at least 3 valid numbers.");
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.result.set(null);

    try {
      const analysis = await this.gemini.analyzeSequence(sequence);
      this.result.set(analysis);
    } catch (err) {
      this.error.set("Analysis failed. Please try again or check your API key.");
    } finally {
      this.isLoading.set(false);
    }
  }

  loadDemo(type: 'lcg' | 'fib') {
    if (type === 'lcg') {
      // Simple LCG: X_n+1 = (5 * X_n + 3) mod 16
      // Start 1: 1 -> 8 -> 11 -> 10 -> 5 -> 12
      this.inputSequence.set("1, 8, 11, 10, 5, 12");
    } else if (type === 'fib') {
      this.inputSequence.set("0, 1, 1, 2, 3, 5, 8, 13, 21");
    }
  }
}
