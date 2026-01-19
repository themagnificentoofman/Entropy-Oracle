
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatrixRainComponent } from './components/matrix-rain.component';
import { AnalyzerComponent } from './components/analyzer.component';
import { PlaygroundComponent } from './components/playground.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MatrixRainComponent, AnalyzerComponent, PlaygroundComponent],
  template: `
    <app-matrix-rain />
    
    <div class="relative z-10 min-h-screen flex flex-col items-center py-10 px-4">
      <!-- Header -->
      <header class="text-center mb-10">
        <h1 class="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-2 tracking-tight">
          ENTROPY ORACLE
        </h1>
        <p class="text-slate-400 font-mono text-sm md:text-base">
          Sequence Prediction & PRNG Analysis System
        </p>
      </header>

      <!-- Navigation -->
      <nav class="flex space-x-2 bg-slate-900/80 p-1 rounded-lg border border-slate-700 mb-8 backdrop-blur-sm">
        <button 
          (click)="activeTab.set('analyzer')"
          [class.bg-cyan-600]="activeTab() === 'analyzer'"
          [class.text-white]="activeTab() === 'analyzer'"
          [class.text-slate-400]="activeTab() !== 'analyzer'"
          class="px-6 py-2 rounded-md text-sm font-semibold transition-all duration-200 focus:outline-none">
          Analyzer
        </button>
        <button 
          (click)="activeTab.set('playground')"
          [class.bg-purple-600]="activeTab() === 'playground'"
          [class.text-white]="activeTab() === 'playground'"
          [class.text-slate-400]="activeTab() !== 'playground'"
          class="px-6 py-2 rounded-md text-sm font-semibold transition-all duration-200 focus:outline-none">
          Generator Lab
        </button>
      </nav>

      <!-- Main Content Area -->
      <main class="w-full max-w-4xl transition-all duration-300">
        <app-analyzer [class.hidden]="activeTab() !== 'analyzer'" />
        <app-playground [class.hidden]="activeTab() !== 'playground'" />
      </main>
      
      <!-- Footer -->
      <footer class="mt-20 text-slate-600 text-xs text-center font-mono">
        <p>CAUTION: Pseudorandomness != Randomness</p>
        <p class="mt-2 opacity-50">Powered by Gemini 2.5 Flash</p>
      </footer>
    </div>
  `,
  styles: []
})
export class AppComponent {
  activeTab = signal<'analyzer' | 'playground'>('analyzer');
}
