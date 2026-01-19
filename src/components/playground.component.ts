
import { Component, signal, computed, ViewChild, ElementRef, AfterViewInit, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type GenCategory = 'LCG & MLCG' | 'Shift Register' | 'Modern & Quality' | 'Chaotic' | 'Classical';

interface AlgoDef {
  id: string;
  name: string;
  category: GenCategory;
  desc: string;
  wiki: string;
}

interface LfsrPreset {
  name: string;
  tap: string;
  desc: string;
}

interface TestResult {
  name: string;
  score: number; // For Pi test this is the value itself, for others it might be Z-score
  displayValue?: string; // Optional custom display string
  status: 'PASS' | 'FAIL' | 'SUSPECT';
  desc: string;
}

@Component({
  selector: 'app-playground',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="glass-panel p-6 rounded-xl border-t border-b border-purple-500/30 shadow-2xl relative overflow-hidden">
      <!-- Background Decor -->
      <div class="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

      <div class="relative z-10">
        <h2 class="text-2xl font-black text-white mb-6 flex items-center tracking-tight">
          <span class="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">GENERATOR LAB</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 ml-3 text-purple-400 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </h2>

        <!-- Category Tabs -->
        <div class="flex flex-wrap gap-2 mb-6 border-b border-slate-700/50 pb-2">
          @for (cat of categories; track cat) {
            <button 
              (click)="setCategory(cat)"
              class="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-200 border border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              [class.bg-slate-800]="activeCategory() === cat"
              [class.text-purple-400]="activeCategory() === cat"
              [class.border-purple-500\/50]="activeCategory() === cat"
              [class.text-slate-500]="activeCategory() !== cat"
              [class.hover:text-slate-300]="activeCategory() !== cat"
              [class.hover:bg-slate-800\/50]="activeCategory() !== cat"
            >
              {{ cat }}
            </button>
          }
        </div>

        <!-- Algorithm Selection Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          @for (algo of filteredAlgorithms(); track algo.id) {
            <button 
              (click)="setMode(algo.id)"
              class="px-3 py-3 rounded-lg text-xs font-bold transition-all text-left border relative overflow-hidden group shadow-sm flex flex-col justify-center min-h-[3.5rem] focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              [class.bg-purple-600]="mode() === algo.id"
              [class.border-purple-400]="mode() === algo.id"
              [class.text-white]="mode() === algo.id"
              [class.shadow-purple-900\/50]="mode() === algo.id"
              [class.bg-slate-800\/50]="mode() !== algo.id"
              [class.border-slate-700]="mode() !== algo.id"
              [class.text-slate-400]="mode() !== algo.id"
              [class.hover:border-purple-500\/50]="mode() !== algo.id"
              [class.hover:text-slate-200]="mode() !== algo.id"
            >
              <span class="relative z-10 truncate w-full">{{ algo.name }}</span>
              @if(mode() === algo.id) {
                 <div class="absolute inset-0 bg-gradient-to-br from-purple-600 to-indigo-600 opacity-100 z-0"></div>
              }
            </button>
          }
        </div>
        
        <!-- Info & Description Panel -->
        <div class="bg-slate-900/60 border-l-4 border-cyan-500 p-5 rounded-r-lg mb-8 flex flex-col sm:flex-row justify-between items-start gap-4 shadow-inner">
           <div class="flex-1">
             <h3 class="text-white font-bold text-lg mb-2 flex flex-wrap items-center gap-2">
               {{ currentAlgo()?.name }}
               <span class="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-cyan-400 border border-slate-700 uppercase tracking-widest">{{ currentAlgo()?.category }}</span>
             </h3>
             <p class="text-slate-300 text-sm leading-relaxed">{{ currentAlgo()?.desc }}</p>
           </div>
           <a [href]="currentAlgo()?.wiki" target="_blank" rel="noopener noreferrer" 
              class="flex-shrink-0 group flex items-center gap-2 text-cyan-500 hover:text-cyan-300 transition-colors text-xs font-mono border border-cyan-900/50 bg-cyan-950/30 px-3 py-2 rounded hover:border-cyan-500 w-full sm:w-auto justify-center" 
              title="Open detailed Wikipedia article in a new tab">
              <span>Wiki</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
           </a>
        </div>

        <!-- Chaotic Visualization Canvas -->
        <div class="mb-8 relative bg-slate-950 rounded-xl border border-slate-800 p-1 overflow-hidden group" [class.hidden]="activeCategory() !== 'Chaotic'">
            <div class="absolute top-3 left-4 z-10 pointer-events-none">
               <label class="text-xs font-bold text-purple-300 bg-slate-900/80 px-2 py-1 rounded backdrop-blur-sm border border-purple-500/20 shadow-lg">
                 @switch (mode()) {
                   @case ('lorenz') { Phase Space (X vs Z) }
                   @case ('rossler') { Phase Space (X vs Y) }
                   @case ('henon') { Phase Space (Orbital Plot) }
                   @case ('ikeda') { Phase Space (Orbital Plot) }
                   @default { Bifurcation Diagram }
                 }
               </label>
            </div>
            <div class="absolute top-3 right-4 z-10 pointer-events-none text-[10px] text-slate-500 font-mono bg-slate-900/80 px-2 py-1 rounded border border-slate-800 hidden sm:block">
                  @if (mode() === 'logistic' || mode() === 'tent') {
                    Click graph to select parameter
                  } @else {
                    Iterating System
                  }
            </div>
            
            <canvas #chaosCanvas (click)="onCanvasClick($event)" width="800" height="250" class="w-full h-56 rounded-lg bg-[#050b14] cursor-crosshair"></canvas>
            
            @if (mode() === 'logistic' || mode() === 'tent') {
              <div class="absolute bottom-3 right-4 z-10 pointer-events-none">
                <div class="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 text-xs text-cyan-300 rounded border border-cyan-800 shadow-lg backdrop-blur">
                  <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                  Current {{ mode() === 'logistic' ? 'r' : 'mu' }} = {{ paramR() }}
                </div>
              </div>
            }
        </div>

        <!-- Parameters Form -->
        <div class="bg-slate-800/30 rounded-xl p-8 border border-slate-700/50 mb-6">
          <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6 border-b border-slate-700/50 pb-2">Configuration Variables</h4>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-8 gap-y-10">
            
            <!-- Parameters based on Mode ID -->
            @switch (mode()) {
              <!-- LCG Family -->
              @case ('lcg') { <ng-container *ngTemplateOutlet="lcgInputs"></ng-container> }
              @case ('randu') { <ng-container *ngTemplateOutlet="lcgInputs"></ng-container> }
              @case ('zx81') { <ng-container *ngTemplateOutlet="lcgInputs"></ng-container> }
              @case ('nr') { <ng-container *ngTemplateOutlet="lcgInputs"></ng-container> }
              @case ('minstd') { <ng-container *ngTemplateOutlet="lcgInputs"></ng-container> }
              @case ('carbon') { <ng-container *ngTemplateOutlet="lcgInputs"></ng-container> }
              @case ('ggn') { <ng-container *ngTemplateOutlet="lcgInputs"></ng-container> }

              <!-- Shift Registers -->
              @case ('xorshift') {
                <ng-container *ngTemplateOutlet="singleSeedBlock; context: {label: 'Seed', badge: 'Non-zero Int32', prop: 'seed'}"></ng-container>
              }
              @case ('xorshift1024') {
                <ng-container *ngTemplateOutlet="singleSeedBlock; context: {label: 'Master Seed', badge: 'Int64', prop: 'seed'}"></ng-container>
              }
              @case ('xoroshiro') {
                 <ng-container *ngTemplateOutlet="multiSeedBlock; context: {label: 'State Vector', badge: '2x Int64', seeds: ['seed', 'seed2']}"></ng-container>
              }
              @case ('xoroshiro128pp') {
                 <ng-container *ngTemplateOutlet="multiSeedBlock; context: {label: 'State Vector', badge: '2x Int64', seeds: ['seed', 'seed2']}"></ng-container>
              }
              @case ('xoroshiro256') {
                 <ng-container *ngTemplateOutlet="multiSeedBlock; context: {label: 'State Vector', badge: '4x Int64', seeds: ['seed', 'seed2', 'seed3', 'seed4']}"></ng-container>
              }
              @case ('tausworthe') {
                 <ng-container *ngTemplateOutlet="multiSeedBlock; context: {label: 'LFSR States', badge: '3x > 128', seeds: ['seed', 'seed2', 'seed3']}"></ng-container>
              }
              @case ('lfsr8') {
                 <ng-container *ngTemplateOutlet="lfsrTemplate; context: { presets: lfsr8Presets, bits: '8-bit' }"></ng-container>
              }
              @case ('lfsr') {
                 <ng-container *ngTemplateOutlet="lfsrTemplate; context: { presets: lfsr16Presets, bits: '16-bit' }"></ng-container>
              }
              @case ('lfsr32') {
                 <ng-container *ngTemplateOutlet="lfsrTemplate; context: { presets: lfsr32Presets, bits: '32-bit' }"></ng-container>
              }
               @case ('lfsr64') {
                 <div class="col-span-1 md:col-span-2">
                    <div class="flex flex-wrap justify-between items-center mb-2 gap-2">
                       <label class="lbl mb-0">Seed <span class="badge-info">(BigInt String)</span></label>
                       <button (click)="randomizeCurrent()" class="btn-random">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                          Randomize Secure Seed
                       </button>
                    </div>
                    <div class="relative w-full">
                        <input type="text" [(ngModel)]="stringSeed" class="inp" placeholder="e.g. 12345" [class.error-border]="currentErrors()['stringSeed']">
                        @if (currentErrors()['stringSeed']) {
                            <div class="absolute right-3 top-3 text-red-500 pointer-events-none" title="Invalid Value">
                               <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                            </div>
                        }
                    </div>
                 </div>
                 <div class="col-span-1 md:col-span-2" title="Feedback polynomial (taps) in Hex.">
                    <label class="lbl">Tap Mask <span class="badge-info">(Hex String)</span></label>
                    <div class="flex flex-col gap-4">
                       <select (change)="updateHexTap($event)" class="sel-input">
                         @for(p of lfsr64Presets; track p.name) { <option [value]="p.tap">{{ p.name }}</option> }
                       </select>
                       <div class="bg-slate-900/50 p-2 rounded text-[10px] text-slate-400 italic border border-slate-700/50 -mt-2">
                          {{ getLfsrDesc(lfsr64Presets) }}
                       </div>
                       <input type="text" [(ngModel)]="hexTap" class="inp font-mono text-xs" [class.error-border]="currentErrors()['hexTap']">
                    </div>
                 </div>
              }
              @case ('isaac') {
                 <div class="col-span-1 md:col-span-2 xl:col-span-4" title="String used to initialize the entropy pool."><label class="lbl">Seed Phrase <span class="badge-info">(Any String)</span></label><input type="text" [(ngModel)]="stringSeed" class="inp" placeholder="Enter entropy string..."></div>
              }
              @case ('mwc64x') {
                 <ng-container *ngTemplateOutlet="singleSeedBlock; context: {label: 'Seed', badge: '0 - 2^64', prop: 'seed'}"></ng-container>
              }
               @case ('sfmt') {
                 <ng-container *ngTemplateOutlet="multiSeedBlock; context: {label: 'State Vector', badge: '4x Int32', seeds: ['seed', 'seed2', 'seed3', 'seed4']}"></ng-container>
              }


              <!-- Modern -->
              @case ('mersenne') {
                <ng-container *ngTemplateOutlet="singleSeedBlock; context: {label: 'Seed', badge: 'Any Int', prop: 'seed'}"></ng-container>
              }
              @case ('pcg') {
                 <ng-container *ngTemplateOutlet="multiSeedBlock; context: {label: 'State & Stream', badge: '2x Int', seeds: ['seed', 'seed2']}"></ng-container>
              }
              @case ('pcg-mcg') {
                 <ng-container *ngTemplateOutlet="singleSeedBlock; context: {label: 'State', badge: 'Odd Int', prop: 'seed'}"></ng-container>
              }
              @case ('pcg-spc') {
                 <ng-container *ngTemplateOutlet="multiSeedBlock; context: {label: 'State & Increment', badge: '2x Int64', seeds: ['seed', 'seed2']}"></ng-container>
              }
              @case ('pcg-rxs-m-xs') {
                 <ng-container *ngTemplateOutlet="multiSeedBlock; context: {label: 'State & Increment', badge: '2x Int64', seeds: ['seed', 'seed2']}"></ng-container>
              }
              @case ('pcg-xsl-rr') {
                 <ng-container *ngTemplateOutlet="multiSeedBlock; context: {label: 'State Low & High', badge: '2x Int64', seeds: ['seed', 'seed2']}"></ng-container>
              }
              @case ('pcg-aes') {
                 <ng-container *ngTemplateOutlet="multiSeedBlock; context: {label: 'AES Key (128-bit)', badge: '4x Int32', seeds: ['seed', 'seed2', 'seed3', 'seed4']}"></ng-container>
              }
              @case ('splitmix') {
                 <ng-container *ngTemplateOutlet="singleSeedBlock; context: {label: 'Seed', badge: 'Int64', prop: 'seed'}"></ng-container>
              }
              @case ('mulberry') {
                 <ng-container *ngTemplateOutlet="singleSeedBlock; context: {label: 'Seed', badge: 'Int32', prop: 'seed'}"></ng-container>
              }
              @case ('sfc32') {
                 <ng-container *ngTemplateOutlet="multiSeedBlock; context: {label: 'State A, B, C', badge: '3x Int32', seeds: ['seed', 'seed2', 'seed3']}"></ng-container>
              }
              @case ('rdrand') {
                <div class="col-span-1 md:col-span-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700 text-center">
                   <p class="text-cyan-400 font-bold mb-1">Hardware Managed</p>
                   <p class="text-xs text-slate-500">Uses CPU's RDRAND instruction via Web Crypto API. No seed required.</p>
                </div>
              }
              @case ('rdseed') {
                <div class="col-span-1 md:col-span-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700 text-center">
                   <p class="text-emerald-400 font-bold mb-1">Hardware Entropy Source</p>
                   <p class="text-xs text-slate-500">Uses CPU's RDSEED instruction via Web Crypto API. Provides full entropy.</p>
                </div>
              }


              <!-- Chaotic & Cellular -->
              @case ('logistic') {
                 <ng-container *ngTemplateOutlet="chaosWarning"></ng-container>
                 <div class="col-span-1 md:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <div class="flex flex-wrap justify-between items-center mb-2 gap-2">
                           <label class="lbl mb-0">Initial X <span class="badge-info">(0.0 - 1.0)</span></label>
                           <button (click)="randomizeCurrent()" class="btn-random">
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                              Randomize State
                           </button>
                        </div>
                        <ng-container *ngTemplateOutlet="floatInput; context: {prop: 'floatSeed'}"></ng-container>
                    </div>
                    <div title="The growth rate parameter (r). Values > 3.57 exhibit chaotic behavior. 4.0 creates full chaos. Extreme precision required for long term.">
                        <label class="lbl">Rate r <span class="badge-info">(2.0 - 4.0)</span></label>
                        <input type="number" [(ngModel)]="paramR" step="0.01" class="inp" (input)="drawChaos()" [class.error-border]="currentErrors()['paramR']">
                        <p class="helper-text">Controls chaos. 3.57+ is chaotic.</p>
                    </div>
                 </div>
              }
              @case ('tent') {
                 <ng-container *ngTemplateOutlet="chaosWarning"></ng-container>
                 <div class="col-span-1 md:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <div class="flex flex-wrap justify-between items-center mb-2 gap-2">
                           <label class="lbl mb-0">Initial X <span class="badge-info">(0.0 - 1.0)</span></label>
                           <button (click)="randomizeCurrent()" class="btn-random">
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                              Randomize State
                           </button>
                        </div>
                        <ng-container *ngTemplateOutlet="floatInput; context: {prop: 'floatSeed'}"></ng-container>
                    </div>
                    <div title="Parameter mu. Controls the height of the 'tent'. Values closer to 2.0 increase chaos. Sensitive to rounding.">
                        <label class="lbl">Mu <span class="badge-info">(1.0 - 2.0)</span></label>
                        <input type="number" [(ngModel)]="paramR" step="0.01" class="inp" (input)="drawChaos()" [class.error-border]="currentErrors()['paramR']">
                    </div>
                 </div>
              }
              @case ('henon') {
                 <ng-container *ngTemplateOutlet="chaosWarning"></ng-container>
                 <div class="col-span-1 md:col-span-4">
                    <div class="flex flex-wrap justify-between items-center mb-2 gap-2">
                       <label class="lbl mb-0">Parameters</label>
                       <button (click)="randomizeCurrent()" class="btn-random">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                          Randomize State
                       </button>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div title="Canonical parameter A. Controls bending. Classic chaotic value is 1.4. High values cause divergence.">
                            <label class="lbl">Param A <span class="badge-info">(~1.4)</span></label>
                            <input type="number" [(ngModel)]="paramA" step="0.01" class="inp" (input)="drawChaos()" [class.error-border]="currentErrors()['paramA']">
                        </div>
                        <div title="Canonical parameter B. Controls contraction. Classic chaotic value is 0.3.">
                            <label class="lbl">Param B <span class="badge-info">(~0.3)</span></label>
                            <input type="number" [(ngModel)]="paramB" step="0.01" class="inp" (input)="drawChaos()" [class.error-border]="currentErrors()['paramB']">
                        </div>
                    </div>
                 </div>
              }
              @case ('ikeda') {
                 <ng-container *ngTemplateOutlet="chaosWarning"></ng-container>
                 <div class="col-span-1 md:col-span-4">
                    <div class="flex flex-wrap justify-between items-center mb-2 gap-2">
                       <label class="lbl mb-0">Parameters</label>
                       <button (click)="randomizeCurrent()" class="btn-random">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                          Randomize State
                       </button>
                    </div>
                    <div title="Parameter u. Controls the chaotic attractor size. u > 0.6 usually results in chaos. Sensitive to float precision.">
                        <label class="lbl">Param U <span class="badge-info">(> 0.6)</span></label>
                        <input type="number" [(ngModel)]="paramA" step="0.01" class="inp" (input)="drawChaos()" [class.error-border]="currentErrors()['paramA']">
                    </div>
                 </div>
              }
              @case ('lorenz') {
                 <ng-container *ngTemplateOutlet="chaosWarning"></ng-container>
                 <div class="col-span-1 md:col-span-4">
                    <div class="flex flex-wrap justify-between items-center mb-2 gap-2">
                       <label class="lbl mb-0">Lorenz Parameters (Sigma, Rho, Beta)</label>
                       <button (click)="randomizeCurrent()" class="btn-random">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                          Randomize State
                       </button>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                        <div title="Prandtl number (Sigma). Default 10.">
                            <label class="lbl">Sigma</label>
                            <input type="number" [(ngModel)]="paramA" step="0.1" class="inp" (input)="drawChaos()">
                        </div>
                        <div title="Rayleigh number (Rho). Chaos at 28.">
                            <label class="lbl">Rho</label>
                            <input type="number" [(ngModel)]="paramB" step="0.1" class="inp" (input)="drawChaos()">
                        </div>
                        <div title="Geometric factor (Beta). Default 8/3 (2.666).">
                            <label class="lbl">Beta</label>
                            <input type="number" [(ngModel)]="paramC" step="0.01" class="inp" (input)="drawChaos()">
                        </div>
                        <div title="Time step (dt). Smaller is more accurate but requires more iterations.">
                            <label class="lbl">dt</label>
                            <input type="number" [(ngModel)]="paramDt" step="0.001" class="inp" (input)="drawChaos()">
                        </div>
                    </div>
                    <div title="Initial X coordinate. Sensitive dependence on initial conditions.">
                        <label class="lbl">Initial X <span class="badge-info">(Float)</span></label>
                        <ng-container *ngTemplateOutlet="floatInput; context: {prop: 'floatSeed'}"></ng-container>
                    </div>
                 </div>
              }
              @case ('rossler') {
                 <ng-container *ngTemplateOutlet="chaosWarning"></ng-container>
                 <div class="col-span-1 md:col-span-4">
                    <div class="flex flex-wrap justify-between items-center mb-2 gap-2">
                       <label class="lbl mb-0">Rössler Parameters (a, b, c)</label>
                       <button (click)="randomizeCurrent()" class="btn-random">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                          Randomize State
                       </button>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                        <div title="Parameter a. Default 0.2.">
                            <label class="lbl">a</label>
                            <input type="number" [(ngModel)]="paramA" step="0.01" class="inp" (input)="drawChaos()">
                        </div>
                        <div title="Parameter b. Default 0.2.">
                            <label class="lbl">b</label>
                            <input type="number" [(ngModel)]="paramB" step="0.01" class="inp" (input)="drawChaos()">
                        </div>
                        <div title="Parameter c. Chaos at 5.7.">
                            <label class="lbl">c</label>
                            <input type="number" [(ngModel)]="paramC" step="0.1" class="inp" (input)="drawChaos()">
                        </div>
                        <div title="Time step (dt).">
                            <label class="lbl">dt</label>
                            <input type="number" [(ngModel)]="paramDt" step="0.001" class="inp" (input)="drawChaos()">
                        </div>
                    </div>
                    <div title="Initial X coordinate.">
                        <label class="lbl">Initial X <span class="badge-info">(Float)</span></label>
                        <ng-container *ngTemplateOutlet="floatInput; context: {prop: 'floatSeed'}"></ng-container>
                    </div>
                 </div>
              }
              @case ('rule30') {
                <ng-container *ngTemplateOutlet="singleSeedBlock; context: {label: 'Initial Row Seed', badge: 'Any Int', prop: 'seed'}"></ng-container>
              }

              <!-- Classical -->
              @case ('fib') {
                <ng-container *ngTemplateOutlet="multiSeedBlock; context: {label: 'Sequence Starters', badge: '2x Int', seeds: ['fibSeed1', 'fibSeed2']}"></ng-container>
              }
              @case ('lagfib') {
                <div class="col-span-1 md:col-span-4">
                    <div class="flex flex-wrap justify-between items-center mb-2 gap-2">
                       <label class="lbl mb-0">Parameters</label>
                       <button (click)="randomizeCurrent()" class="btn-random">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                          Randomize Secure Seed
                       </button>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="lbl">Seed (Start) <span class="badge-info">(Int)</span></label>
                            <input type="number" [(ngModel)]="seed" class="inp" [class.error-border]="currentErrors()['seed']">
                        </div>
                        <div>
                            <label class="lbl">Modulus (m) <span class="badge-info">(> 0)</span></label>
                            <input type="number" [(ngModel)]="m" class="inp" [class.error-border]="currentErrors()['m']">
                        </div>
                    </div>
                </div>
              }
              @case ('middleSquare') {
                 <ng-container *ngTemplateOutlet="singleSeedBlock; context: {label: 'Seed', badge: '4-8 digits', prop: 'seed'}"></ng-container>
              }
              @case ('wichmann') {
                <ng-container *ngTemplateOutlet="multiSeedBlock; context: {label: 'Three Seeds', badge: '3x Int', seeds: ['seed', 'seed2', 'seed3']}"></ng-container>
              }
            }
            
            <ng-template #chaosWarning>
               <div class="col-span-1 md:col-span-4 mt-2 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded text-[10px] text-yellow-500 flex items-start gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <span>
                    <strong>Instability Warning:</strong> Chaotic generators rely on iterative feedback loops.
                    Floating-point errors (IEEE 754) accumulate rapidly, causing trajectories to diverge from theoretical values after just a few steps (Lyapunov time).
                    Extreme parameters or long durations may result in numerical explosion (Infinity/NaN) or collapse to stable periodic cycles.
                    Use default parameters for reliable chaotic behavior.
                  </span>
               </div>
            </ng-template>

            <!-- Reusable LFSR Template (Preserved with small style tweak) -->
            <ng-template #lfsrTemplate let-presets="presets" let-bits="bits">
               <div class="col-span-1 md:col-span-4">
                   <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div>
                           <div class="flex flex-wrap justify-between items-center mb-2 gap-2">
                               <label class="lbl mb-0">Seed <span class="badge-info">({{bits}} Int)</span></label>
                               <button (click)="randomizeCurrent()" class="btn-random">
                                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                  Randomize Secure Seed
                               </button>
                           </div>
                           <ng-container *ngTemplateOutlet="singleInputWithIcon; context: {prop: 'seed'}"></ng-container>
                       </div>
                       <div title="The feedback polynomial in Hex. Determines the sequence length.">
                          <label class="lbl">Tap Mask <span class="badge-info">(Hex String)</span></label>
                          <div class="flex flex-col gap-4">
                             <select (change)="updateHexTap($event, presets)" class="sel-input">
                               @for(p of presets; track p.name) { <option [value]="p.tap">{{ p.name }}</option> }
                             </select>
                             <div class="bg-slate-900/50 p-2 rounded text-[10px] text-slate-400 italic border border-slate-700/50 -mt-2 min-h-[40px] flex items-center">
                                {{ getLfsrDesc(presets) }}
                             </div>
                             <div class="relative w-full">
                              <input type="text" [(ngModel)]="hexTap" class="inp w-full" [class.error-border]="currentErrors()['hexTap']">
                               @if (currentErrors()['hexTap']) {
                                <div class="absolute right-3 top-3 text-red-500" title="Invalid Hex">
                                   <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                                </div>
                              }
                             </div>
                          </div>
                       </div>
                   </div>
               </div>
            </ng-template>

            <!-- Reusable LCG Inputs Template -->
            <ng-template #lcgInputs>
              <div class="col-span-1 md:col-span-4">
                  <div class="flex flex-wrap justify-between items-center mb-4 pb-2 border-b border-slate-700/50 gap-2">
                     <label class="lbl mb-0">LCG Parameters</label>
                     <button (click)="randomizeCurrent()" class="btn-random">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        Randomize All Parameters
                     </button>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div title="The multiplier 'a'."><label class="lbl">Multiplier (a) <span class="badge-info">(0 - m)</span></label><ng-container *ngTemplateOutlet="singleInputWithIcon; context: {prop: 'a'}"></ng-container></div>
                      <div title="The increment 'c'."><label class="lbl">Increment (c) <span class="badge-info">(0 - m)</span></label><ng-container *ngTemplateOutlet="singleInputWithIcon; context: {prop: 'c'}"></ng-container></div>
                      <div title="The modulus 'm'."><label class="lbl">Modulus (m) <span class="badge-info">(> 0)</span></label><ng-container *ngTemplateOutlet="singleInputWithIcon; context: {prop: 'm'}"></ng-container></div>
                      <div title="The initial value (X₀)."><label class="lbl">Seed (X₀) <span class="badge-info">(0 - m)</span></label><ng-container *ngTemplateOutlet="singleInputWithIcon; context: {prop: 'seed'}"></ng-container></div>
                  </div>
              </div>
            </ng-template>
            
            <!-- Standard Multi-Seed Block -->
            <ng-template #multiSeedBlock let-label="label" let-badge="badge" let-seeds="seeds">
                <div class="col-span-1 md:col-span-4">
                    <div class="flex flex-wrap justify-between items-center mb-2 gap-2">
                       <label class="lbl mb-0">{{label}} <span class="badge-info" *ngIf="badge">({{badge}})</span></label>
                       <button (click)="randomizeCurrent()" class="btn-random">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                          Randomize Secure Seed
                       </button>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                        @for (s of seeds; track s) {
                            <div class="relative w-full">
                                <input type="number" [(ngModel)]="this[s]" class="inp text-xs px-3" [class.error-border]="currentErrors()[s]">
                                @if (currentErrors()[s]) {
                                    <div class="absolute right-2 top-2 text-red-500 pointer-events-none" title="Invalid Value">
                                       <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                                    </div>
                                }
                            </div>
                        }
                    </div>
                </div>
            </ng-template>

            <!-- Standard Single-Seed Block -->
            <ng-template #singleSeedBlock let-label="label" let-badge="badge" let-prop="prop">
                <div class="col-span-1 md:col-span-4"> 
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4"> 
                       <div class="col-span-1">
                           <div class="flex flex-wrap justify-between items-center mb-2 gap-2">
                               <label class="lbl mb-0">{{label}} <span class="badge-info" *ngIf="badge">({{badge}})</span></label>
                               <button (click)="randomizeCurrent()" class="btn-random">
                                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                  Randomize Secure Seed
                               </button>
                           </div>
                           <ng-container *ngTemplateOutlet="singleInputWithIcon; context: {prop: prop}"></ng-container>
                       </div>
                    </div>
                </div>
            </ng-template>

            <!-- Reusable Single Input with Icon Validation -->
            <ng-template #singleInputWithIcon let-prop="prop">
               <div class="relative w-full">
                 <input type="number" [(ngModel)]="this[prop]" class="inp" [class.error-border]="currentErrors()[prop]">
                 @if (currentErrors()[prop]) {
                    <div class="absolute right-3 top-3 text-red-500 pointer-events-none" title="Invalid Value">
                       <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                    </div>
                 }
               </div>
            </ng-template>

            <!-- Float Seed Input Template -->
            <ng-template #floatInput let-prop="prop">
                <div class="relative w-full">
                    <input type="number" [(ngModel)]="this[prop]" step="0.01" class="inp" [class.error-border]="currentErrors()[prop]">
                    @if (currentErrors()[prop]) {
                       <div class="absolute right-3 top-3 text-red-500 pointer-events-none" title="Invalid Value">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                       </div>
                    }
                </div>
            </ng-template>

            <!-- Count -->
            <div class="col-span-1 sm:col-span-2 xl:col-span-4 border-t border-slate-700/50 pt-8 mt-6">
                <div class="flex flex-col sm:flex-row items-center gap-6 bg-slate-900/40 p-4 rounded-lg border border-slate-800">
                    <div class="w-full flex-1">
                        <label class="lbl mb-2" title="Number of random values to generate for display.">Display Length <span class="badge-info">(3 - 500)</span></label>
                        <input type="range" [(ngModel)]="count" min="3" max="500" class="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400">
                    </div>
                    <div class="w-full sm:w-24">
                         <label class="lbl text-center mb-2 justify-center">Count</label>
                        <input type="number" [(ngModel)]="count" min="3" max="500" class="inp text-center font-bold text-lg">
                    </div>
                </div>
            </div>
          </div>
        </div>

        <!-- Errors Display -->
        @if (hasErrors()) {
           <div class="mb-6 p-4 bg-red-950/40 border-l-4 border-red-500 rounded-r shadow-lg animation-shake">
              <p class="font-bold text-red-400 mb-2 flex items-center text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                Validation Issues Detected
              </p>
              <ul class="list-disc pl-5 space-y-1 text-xs text-red-300">
                  @for (key of objectKeys(currentErrors()); track key) {
                      <li>{{ currentErrors()[key] }}</li>
                  }
              </ul>
           </div>
        }

        <div class="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <button (click)="generate()" class="w-full sm:w-auto group relative bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-purple-900/30 overflow-hidden">
             <div class="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
             <span class="relative flex items-center justify-center">
               Generate Sequence
               <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
               </svg>
             </span>
          </button>
          
          <button (click)="reset()" class="text-xs text-slate-500 hover:text-white transition-colors underline decoration-slate-700 hover:decoration-white underline-offset-4">
            Reset to Defaults
          </button>
        </div>

        <!-- Output Area -->
        @if (sequence().length > 0) {
          <div class="bg-slate-900/80 p-5 rounded-lg border border-slate-700 shadow-xl relative group animation-fade-in">
             <div class="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-4 pb-2 border-b border-slate-800 gap-4">
               <h3 class="text-xs text-purple-400 uppercase tracking-widest font-bold flex items-center">
                 <span class="w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
                 Output Sequence ({{sequence().length}})
               </h3>
               
               <div class="flex flex-col sm:flex-row gap-4 items-center w-full xl:w-auto">
                   <!-- Test Sample Size Input -->
                   <div class="flex items-center gap-2 bg-slate-800/50 p-1.5 rounded border border-slate-700">
                      <label class="text-[10px] text-slate-400 uppercase font-bold pl-1">Test Samples:</label>
                      <input type="number" [(ngModel)]="testLimit" class="bg-slate-900 text-white text-xs border border-slate-600 rounded px-2 py-1 w-20 text-center focus:border-cyan-500 focus:outline-none" title="Sample size for statistical tests. Default 1000.">
                   </div>

                   <div class="flex flex-wrap gap-2 w-full sm:w-auto">
                       <button (click)="performChiSquared()" class="flex-grow sm:flex-none justify-center bg-indigo-900/50 border border-indigo-700/50 text-xs text-indigo-300 px-3 py-1.5 rounded hover:bg-indigo-800/50 transition-colors flex items-center shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                          Chi-Squared Test
                       </button>
                       <button (click)="performDieharder()" class="flex-grow sm:flex-none justify-center bg-teal-900/50 border border-teal-700/50 text-xs text-teal-300 px-3 py-1.5 rounded hover:bg-teal-800/50 transition-colors flex items-center shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                          Extended Test Suite
                       </button>
                       <button (click)="copyToClipboard()" class="flex-grow sm:flex-none bg-slate-700 hover:bg-slate-600 text-xs text-white px-3 py-1.5 rounded transition-colors flex items-center min-w-[70px] justify-center shadow-sm">
                          @if (copyStatus() === 'Copied!') {
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                          }
                          {{ copyStatus() }}
                       </button>
                   </div>
               </div>
             </div>

             <!-- Chi Squared Result -->
             @if (chiResult()) {
                <div class="mb-4 px-4 py-3 rounded-md text-xs flex justify-between items-center font-mono border shadow-sm"
                    [class.bg-emerald-950\/50]="chiResult()?.passed"
                    [class.border-emerald-500\/50]="chiResult()?.passed"
                    [class.text-emerald-300]="chiResult()?.passed"
                    [class.bg-red-950\/50]="!chiResult()?.passed"
                    [class.border-red-500\/50]="!chiResult()?.passed"
                    [class.text-red-300]="!chiResult()?.passed">
                    <span class="flex items-center font-bold">
                      <svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" *ngIf="chiResult()?.passed" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" *ngIf="!chiResult()?.passed" />
                      </svg>
                      {{ chiResult()?.passed ? 'PASSED Frequency Test' : 'FAILED Frequency Test' }}
                    </span>
                    <span class="opacity-75 font-mono">
                      χ² = {{ chiResult()?.score?.toFixed(2) }} (Critical: 16.92)
                    </span>
                </div>
             }

             <!-- Extended Results -->
             @if (dieharderResults().length > 0) {
               <div class="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                 @for (res of dieharderResults(); track res.name) {
                   <div class="p-3 rounded border bg-slate-800/50 flex flex-col justify-between h-full"
                        [class.border-emerald-500\/40]="res.status === 'PASS'"
                        [class.border-red-500\/40]="res.status === 'FAIL'"
                        [class.border-yellow-500\/40]="res.status === 'SUSPECT'">
                     <div>
                       <div class="flex justify-between items-start mb-1">
                         <span class="font-bold text-xs text-slate-300 truncate pr-1" [title]="res.name">{{ res.name }}</span>
                         <span class="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold flex-shrink-0"
                               [class.bg-emerald-900]="res.status === 'PASS'" [class.text-emerald-300]="res.status === 'PASS'"
                               [class.bg-red-900]="res.status === 'FAIL'" [class.text-red-300]="res.status === 'FAIL'"
                               [class.bg-yellow-900]="res.status === 'SUSPECT'" [class.text-yellow-300]="res.status === 'SUSPECT'">
                           {{ res.status }}
                         </span>
                       </div>
                       <p class="text-[10px] text-slate-500 leading-tight mb-2 min-h-[2.5em]">{{ res.desc }}</p>
                     </div>
                     <div class="text-right text-[10px] font-mono opacity-80 border-t border-slate-700/50 pt-1">
                        {{ res.displayValue ? res.displayValue : 'Score: ' + res.score.toFixed(4) }}
                     </div>
                   </div>
                 }
               </div>
               <p class="text-[10px] text-slate-500 italic mb-4 text-center">
                 * Note: These are simplified implementations of statistical tests. Tests used {{testLimit()}} samples.
               </p>
             }

             <div class="font-mono text-purple-300 break-all text-sm leading-relaxed max-h-60 overflow-y-auto custom-scrollbar bg-slate-950/50 p-4 rounded border border-slate-800/50">
               {{ sequenceString() }}
             </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .lbl { @apply flex flex-wrap items-end gap-2 text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider; }
    .inp { @apply w-full bg-slate-900/50 border border-slate-700/50 text-white px-3 py-2 rounded-lg focus:border-cyan-500/50 focus:bg-slate-900 focus:ring-1 focus:ring-cyan-500/20 outline-none font-mono text-xs transition-all shadow-sm; }
    .sel-input { @apply bg-slate-900/50 border border-slate-700/50 text-white text-xs rounded-lg px-3 py-2 w-full hover:border-purple-500/50 transition-colors cursor-pointer outline-none focus:ring-1 focus:ring-purple-500/20 appearance-none; }
    .error-border { @apply border-red-500 bg-red-900/10 focus:border-red-500 focus:ring-red-500 !important; }
    .badge-info { @apply ml-0 text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 normal-case font-mono whitespace-nowrap; }
    .helper-text { @apply text-[10px] text-slate-500 mt-2 italic; }
    .btn-random { @apply text-[10px] uppercase font-bold tracking-wider bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-cyan-400 px-3 py-1.5 rounded border border-cyan-500/30 hover:border-cyan-400 transition-all shadow-sm hover:shadow-cyan-500/20 flex items-center gap-2 cursor-pointer select-none whitespace-nowrap active:scale-95; }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.5); }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(71, 85, 105, 0.5); border-radius: 3px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(147, 51, 234, 0.5); }
    .animation-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
    .animation-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes shake {
      10%, 90% { transform: translate3d(-1px, 0, 0); }
      20%, 80% { transform: translate3d(2px, 0, 0); }
      30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
      40%, 60% { transform: translate3d(4px, 0, 0); }
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class PlaygroundComponent implements AfterViewInit {
  [key: string]: any;

  @ViewChild('chaosCanvas') chaosCanvas!: ElementRef<HTMLCanvasElement>;

  // State
  activeCategory = signal<GenCategory>('LCG & MLCG');
  mode = signal<string>('lcg');
  count = signal(10);
  testLimit = signal(1000);
  
  // Computed Validation State (Reactive)
  currentErrors = computed(() => {
    const errs: Record<string, string> = {};
    const mode = this.mode();
    const m = this.m();
    const a = this.a();
    const c = this.c();
    const seed = this.seed();
    const count = this.count();

    if (count === null || count <= 0) {
      errs['count'] = "Count must be a positive integer.";
    }

    // Specific LCG Checks
    if (['lcg', 'randu', 'zx81', 'nr', 'minstd', 'carbon', 'ggn'].includes(mode)) {
       if (m === null || m <= 0) errs['m'] = "Modulus (m) must be > 0.";
       if (a === null || a < 0) errs['a'] = "Multiplier (a) must be >= 0.";
       
       if (c === 0 && a !== null && m !== null) {
          if (this.gcd(a, m) !== 1) {
             errs['a'] = "Warning: When c=0, 'a' and 'm' should be coprime.";
          }
       }
       if ((mode === 'minstd' || mode === 'carbon' || mode === 'ggn') && (seed === null || seed === 0)) {
         errs['seed'] = "For Multiplicative LCGs (c=0), the Seed must not be 0.";
       }
    }

    // Modern / Shift Checks
    if (mode === 'xorshift' && seed === 0) errs['seed'] = "Xorshift seed must not be 0.";
    if (mode === 'xorshift1024' && seed === 0) errs['seed'] = "Master seed cannot be 0.";
    if (mode === 'tausworthe') {
        if ((seed ?? 0) < 128) errs['seed'] = "Seed 1 must be >= 128.";
        if ((this.seed2() ?? 0) < 128) errs['seed2'] = "Seed 2 must be >= 128.";
        if ((this.seed3() ?? 0) < 128) errs['seed3'] = "Seed 3 must be >= 128.";
    }
    if ((mode.startsWith('lfsr')) && (mode !== 'lfsr64') && (seed === 0)) errs['seed'] = "LFSR seed cannot be 0.";
    if ((mode.startsWith('lfsr')) && !/^[0-9A-Fa-f]+$/.test(this.hexTap() || '')) {
        errs['hexTap'] = "Tap mask must be a valid Hex string.";
    }
    if (mode === 'lfsr64' && (!this.stringSeed() || this.stringSeed() === '0')) {
        errs['stringSeed'] = "LFSR64 seed must be non-zero.";
    }
    
    // PCG MCG Check
    if ((mode === 'pcg-mcg' || mode === 'pcg-spc' || mode === 'pcg-rxs-m-xs') && (seed ?? 0) % 2 === 0) {
         if (mode === 'pcg-mcg') errs['seed'] = "PCG-MCG state must be odd.";
    }
    if (mode === 'pcg-spc' || mode === 'pcg-rxs-m-xs') {
       const inc = this.seed2() ?? 1;
       if (inc % 2 === 0) errs['seed2'] = "Increment must be odd for full period.";
    }

    // Chaotic Checks
    if (['logistic', 'tent', 'henon', 'ikeda', 'lorenz', 'rossler'].includes(mode)) {
        if (['logistic', 'tent', 'henon', 'ikeda'].includes(mode)) {
             const x = this.floatSeed() ?? -1;
             if ((mode === 'logistic' || mode === 'tent') && (x <= 0 || x >= 1)) errs['floatSeed'] = "Initial state must be strictly between 0.0 and 1.0.";
        }
    }
    if (mode === 'logistic') {
        const r = this.paramR() ?? 0;
        if (r < 2.0 || r > 4.0) errs['paramR'] = "Logistic Map r should be between 2.0 and 4.0.";
    }
    if (mode === 'tent') {
        const mu = this.paramR() ?? 0;
        if (mu < 1.0 || mu > 2.0) errs['paramR'] = "Tent Map mu should be between 1.0 and 2.0.";
    }

    return errs;
  });

  chiResult = signal<{score: number, passed: boolean} | null>(null);
  dieharderResults = signal<TestResult[]>([]);

  categories: GenCategory[] = ['LCG & MLCG', 'Shift Register', 'Modern & Quality', 'Chaotic', 'Classical'];
  
  algorithms: AlgoDef[] = [
    { id: 'lcg', name: 'Custom LCG', category: 'LCG & MLCG', desc: 'The Linear Congruential Generator is the "Hello World" of PRNGs. Defined by the recurrence X = (aX + c) mod m. Fast, but statistical quality depends heavily on parameters.', wiki: 'https://en.wikipedia.org/wiki/Linear_congruential_generator' },
    { id: 'randu', name: 'RANDU', category: 'LCG & MLCG', desc: 'An infamous LCG from the 1960s (IBM). Its parameters cause points to fall onto only 15 planes in 3D space, making it terrible for simulations.', wiki: 'https://en.wikipedia.org/wiki/RANDU' },
    { id: 'zx81', name: 'ZX81 LCG', category: 'LCG & MLCG', desc: 'The generator used in the Sinclair ZX81 (1981). A compact implementation typical of early 8-bit computing era randomness.', wiki: 'https://en.wikipedia.org/wiki/Linear_congruential_generator#Parameters_in_common_use' },
    { id: 'nr', name: 'Numerical Recipes', category: 'LCG & MLCG', desc: 'The standard "ranqd1" generator recommended in the book "Numerical Recipes". A reliable 32-bit LCG for general purpose non-crypto use.', wiki: 'https://en.wikipedia.org/wiki/Numerical_Recipes' },
    { id: 'minstd', name: 'MINSTD (MLCG)', category: 'LCG & MLCG', desc: 'The "Minimum Standard" generator proposed by Park & Miller (1988). A multiplicative LCG (c=0) with parameters chosen to pass spectral tests.', wiki: 'https://en.wikipedia.org/wiki/Lehmer_random_number_generator' },
    { id: 'carbon', name: 'Apple CarbonLib', category: 'LCG & MLCG', desc: 'Historical generator used in Apple\'s CarbonLib and QuickDraw. A standard MLCG variant.', wiki: 'https://en.wikipedia.org/wiki/Linear_congruential_generator' },
    { id: 'ggn', name: 'GGN', category: 'LCG & MLCG', desc: 'Glushkov-Gustavson-Naur (GGL). A widespread MLCG parameter set often used in early simulations.', wiki: 'https://en.wikipedia.org/wiki/Linear_congruential_generator' },
    { id: 'isaac', name: 'ISAAC', category: 'LCG & MLCG', desc: 'ISAAC (Indirection, Shift, Accumulate, Add, and Count). A fast cryptographic PRNG designed to be secure and bias-free.', wiki: 'https://en.wikipedia.org/wiki/ISAAC_(cipher)' },
    { id: 'mwc64x', name: 'MWC64X', category: 'LCG & MLCG', desc: 'Multiply-With-Carry 64-bit. High-performance generator, commonly used in GPU computing (OpenCL/CUDA) for its speed and low register usage.', wiki: 'https://en.wikipedia.org/wiki/Multiply-with-carry_pseudorandom_number_generator' },

    { id: 'xorshift', name: 'Xorshift32', category: 'Shift Register', desc: 'A class of PRNGs discovered by George Marsaglia. It uses only XOR and bit-shift operations, making it incredibly fast but failing some statistical tests.', wiki: 'https://en.wikipedia.org/wiki/Xorshift' },
    { id: 'xorshift1024', name: 'Xorshift1024*', category: 'Shift Register', desc: 'A high-quality generator with a massive 1024-bit state. It passes the BigCrush suite and has an extremely long period (2^1024 - 1).', wiki: 'https://en.wikipedia.org/wiki/Xorshift#xorshift*' },
    { id: 'xoroshiro', name: 'Xoroshiro128+', category: 'Shift Register', desc: 'Successor to Xorshift. "XOR/rotate/shift/rotate". One of the fastest high-quality generators available for non-crypto use.', wiki: 'https://en.wikipedia.org/wiki/Xoroshiro128%2B' },
    { id: 'xoroshiro128pp', name: 'Xoroshiro128++', category: 'Shift Register', desc: 'Improvement on Xoroshiro128+. Uses a different scrambler (++) that eliminates some artifacts. Excellent all-purpose generator.', wiki: 'https://prng.di.unimi.it/' },
    { id: 'xoroshiro256', name: 'Xoroshiro256++', category: 'Shift Register', desc: 'High-capacity variant with 256-bit state. The "++" scrambler improves statistical quality. Ideal for large-scale parallel simulations.', wiki: 'https://prng.di.unimi.it/' },
    { id: 'tausworthe', name: 'Tausworthe', category: 'Shift Register', desc: 'A "Maximally Equidistributed Combined Tausworthe" generator (taus88). Combines multiple LFSRs to achieve long periods and better statistical properties.', wiki: 'https://en.wikipedia.org/wiki/Linear-feedback_shift_register' },
    { id: 'lfsr8', name: 'LFSR (8-bit)', category: 'Shift Register', desc: 'A simple 8-bit Linear Feedback Shift Register. Educational model to demonstrate how hardware shift registers generate pseudo-random bits.', wiki: 'https://en.wikipedia.org/wiki/Linear-feedback_shift_register' },
    { id: 'lfsr', name: 'LFSR (16-bit)', category: 'Shift Register', desc: '16-bit LFSR using Galois configuration. Often used in older hardware (e.g., SNES noise channel) and simple obfuscation.', wiki: 'https://en.wikipedia.org/wiki/Linear-feedback_shift_register' },
    { id: 'lfsr32', name: 'LFSR (32-bit)', category: 'Shift Register', desc: '32-bit maximal-length LFSR. With proper taps, it has a period of 2^32-1. Common in digital systems testing (CRC, BIST).', wiki: 'https://en.wikipedia.org/wiki/Linear-feedback_shift_register' },
    { id: 'lfsr64', name: 'LFSR (64-bit)', category: 'Shift Register', desc: '64-bit LFSR. Provides a massive period (approx 1.8e19) compared to 32-bit. Used in high-speed communication systems testing.', wiki: 'https://en.wikipedia.org/wiki/Linear-feedback_shift_register' },
    { id: 'sfmt', name: 'SFMT', category: 'Shift Register', desc: 'SIMD-oriented Fast Mersenne Twister. Optimized for modern CPUs using SIMD instructions. Roughly twice as fast as the original MT19937.', wiki: 'https://en.wikipedia.org/wiki/Mersenne_Twister#SFMT' },
    
    { id: 'mersenne', name: 'Mersenne Twister', category: 'Modern & Quality', desc: 'MT19937. The industry standard for Monte Carlo simulations. Huge period (2^19937-1) and high dimensionality, but fails some modern tests (BigCrush).', wiki: 'https://en.wikipedia.org/wiki/Mersenne_Twister' },
    { id: 'pcg', name: 'PCG-XSH-RR', category: 'Modern & Quality', desc: 'Permuted Congruential Generator. Applies a permutation function to the output of an LCG. Better statistical quality and harder to predict than LCGs.', wiki: 'https://en.wikipedia.org/wiki/Permuted_congruential_generator' },
    { id: 'pcg-mcg', name: 'PCG-MCG', category: 'Modern & Quality', desc: 'PCG variant using a Multiplicative Congruential base (no increment). Faster than standard PCG but requires an odd-numbered seed/state.', wiki: 'https://en.wikipedia.org/wiki/Permuted_congruential_generator' },
    { id: 'pcg-spc', name: 'PCG-SPC', category: 'Modern & Quality', desc: 'Small PCG variant (RXS-M-XS). Offers excellent statistical performance with small state size.', wiki: 'https://www.pcg-random.org/' },
    { id: 'pcg-rxs-m-xs', name: 'PCG-RXS-M-XS', category: 'Modern & Quality', desc: 'A statistically strong PCG variant with 64-bit state and 64-bit output. Passes BigCrush. Best for 64-bit generation.', wiki: 'https://www.pcg-random.org/' },
    { id: 'pcg-xsl-rr', name: 'PCG-XSL-RR (128/64)', category: 'Modern & Quality', desc: 'The default "PCG64" generator. Uses 128-bit state and produces 64-bit output via XSL-RR permutation.', wiki: 'https://www.pcg-random.org/' },
    { id: 'pcg-aes', name: 'PCG-AES', category: 'Modern & Quality', desc: 'Uses AES-128 in Counter Mode. A cryptographically secure generator (CSPRNG) leveraging the Advanced Encryption Standard.', wiki: 'https://en.wikipedia.org/wiki/Advanced_Encryption_Standard' },
    { id: 'rdrand', name: 'RDRAND (HW)', category: 'Modern & Quality', desc: 'Hardware Random Number Generator instruction. Uses thermal noise or other hardware entropy sources via the CPU.', wiki: 'https://en.wikipedia.org/wiki/RDRAND' },
    { id: 'rdseed', name: 'RDSEED (HW)', category: 'Modern & Quality', desc: 'Hardware entropy source intended for seeding other PRNGs. Provides full entropy from the hardware.', wiki: 'https://en.wikipedia.org/wiki/RDRAND' },
    { id: 'splitmix', name: 'SplitMix64', category: 'Modern & Quality', desc: 'A fast, splittable 64-bit generator. The standard algorithm used to initialize the state of other generators (like Xoroshiro) from a single 64-bit seed.', wiki: 'https://en.wikipedia.org/wiki/SplitMix' },
    { id: 'mulberry', name: 'Mulberry32', category: 'Modern & Quality', desc: 'A fast, high-quality 32-bit generator often used as a lightweight alternative to SplitMix for 32-bit environments.', wiki: 'https://github.com/skeeto/hash-prospector' },
    { id: 'sfc32', name: 'SFC32', category: 'Modern & Quality', desc: 'Small Fast Counter. Part of the PractRand test suite. Extremely fast and passes the BigCrush statistical test suite.', wiki: 'http://practice.dafe.pts.org.tw/RNG/PRNG_SFC.html' },

    { id: 'logistic', name: 'Logistic Map', category: 'Chaotic', desc: 'A classic example of how complex, chaotic behavior can arise from simple non-linear dynamical equations. Popular in chaos theory education.', wiki: 'https://en.wikipedia.org/wiki/Logistic_map' },
    { id: 'tent', name: 'Tent Map', category: 'Chaotic', desc: 'A piecewise linear map on the interval [0,1]. Like the Logistic map, it exhibits chaotic behavior and sensitivity to initial conditions.', wiki: 'https://en.wikipedia.org/wiki/Tent_map' },
    { id: 'henon', name: 'Hénon Map', category: 'Chaotic', desc: 'A discrete-time dynamical system. It is one of the most studied examples of dynamical systems that exhibit strange attractors.', wiki: 'https://en.wikipedia.org/wiki/H%C3%A9non_map' },
    { id: 'ikeda', name: 'Ikeda Map', category: 'Chaotic', desc: 'A discrete-time dynamical system derived from a model of light circulating in a non-linear optical resonator (ring cavity).', wiki: 'https://en.wikipedia.org/wiki/Ikeda_map' },
    { id: 'lorenz', name: 'Lorenz Attractor', category: 'Chaotic', desc: 'A system of ordinary differential equations for atmospheric convection. Known for its butterfly-shaped strange attractor.', wiki: 'https://en.wikipedia.org/wiki/Lorenz_system' },
    { id: 'rossler', name: 'Rössler Attractor', category: 'Chaotic', desc: 'A system of three non-linear differential equations designed to behave similarly to the Lorenz attractor but easier to analyze qualitatively.', wiki: 'https://en.wikipedia.org/wiki/R%C3%B6ssler_attractor' },
    { id: 'rule30', name: 'Rule 30', category: 'Chaotic', desc: 'A one-dimensional cellular automaton introduced by Stephen Wolfram. It generates complex, seemingly random patterns from simple rules.', wiki: 'https://en.wikipedia.org/wiki/Rule_30' },
    
    { id: 'fib', name: 'Fibonacci', category: 'Classical', desc: 'The Fibonacci sequence is predictable, but its modulo variant is the basis for Lagged Fibonacci Generators. F(n) = F(n-1) + F(n-2).', wiki: 'https://en.wikipedia.org/wiki/Fibonacci_number' },
    { id: 'lagfib', name: 'Lagged Fibonacci', category: 'Classical', desc: 'An improvement on the standard Fibonacci generator. It uses indices much further back in the sequence (lags) to increase the period.', wiki: 'https://en.wikipedia.org/wiki/Lagged_Fibonacci_generator' },
    { id: 'middleSquare', name: 'Middle Square', category: 'Classical', desc: 'Proposed by John von Neumann in 1949. It squares the number and extracts the middle digits. Historically interesting but very poor quality (short cycles).', wiki: 'https://en.wikipedia.org/wiki/Middle-square_method' },
    { id: 'wichmann', name: 'Wichmann-Hill', category: 'Classical', desc: 'Combines three LCGs to produce a longer period. Used as the default RNG in Excel 2003 and Python < 2.3.', wiki: 'https://en.wikipedia.org/wiki/Wichmann%E2%80%93Hill' },
  ];

  filteredAlgorithms = computed(() => this.algorithms.filter(a => a.category === this.activeCategory()));
  currentDesc = computed(() => this.algorithms.find(a => a.id === this.mode()));
  currentAlgo = computed(() => this.algorithms.find(a => a.id === this.mode()));

  // LFSR Presets
  lfsr8Presets: LfsrPreset[] = [
    { name: 'Max Length (1D)', tap: '1D', desc: 'Maximal length period (255).' }, 
    { name: 'Standard (B8)', tap: 'B8', desc: 'Maximal length configuration.' },
    { name: 'Alt Max (8D)', tap: '8D', desc: 'Another primitive polynomial.' },
    { name: 'Simple (8E)', tap: '8E', desc: 'Non-maximal, shorter cycle.' },
    { name: 'CRT (71)', tap: '71', desc: 'CRT controller timing circuits.' }, 
    { name: 'Compact (9B)', tap: '9B', desc: 'Optimized for hardware gates.' }
  ];
  lfsr16Presets: LfsrPreset[] = [
    { name: 'Standard (B400)', tap: 'B400', desc: 'Standard maximal length (65535).' },
    { name: 'CCITT (1021)', tap: '1021', desc: 'Common in CRC-CCITT (X.25).' },
    { name: 'IBM (8005)', tap: '8005', desc: 'Used in CRC-16 (IBM/ANSI).' },
    { name: 'Maxim (8003)', tap: '8003', desc: 'Used in Maxim iButton devices.' },
    { name: 'Modbus (A001)', tap: 'A001', desc: 'Used in Modbus communication protocol.' },
    { name: 'USB (800D)', tap: '800D', desc: 'Polynomial used in USB CRC16.' }
  ];
  lfsr32Presets: LfsrPreset[] = [
    { name: 'Xilinx Standard', tap: '80200003', desc: 'Xilinx application note standard taps.' },
    { name: 'CRC-32 (04C11DB7)', tap: '04C11DB7', desc: 'Ethernet, ZIP, PNG checksum standard.' },
    { name: 'Ethernet (EDB88320)', tap: 'EDB88320', desc: 'Reversed representation of CRC-32.' },
    { name: 'SATA (00000057)', tap: '00000057', desc: 'Used in SATA hashing.' },
    { name: 'Castagnoli (1EDC6F41)', tap: '1EDC6F41', desc: 'CRC-32C, used in iSCSI/Btrfs.' },
    { name: 'Koopman (741B8CD7)', tap: '741B8CD7', desc: 'Optimized for error detection.' }
  ];
  lfsr64Presets: LfsrPreset[] = [
    { name: 'Standard Max Length', tap: 'D800000000000000', desc: 'Primitive polynomial for maximal period.' },
    { name: 'ECMA-182', tap: 'C96C5795D7870F42', desc: 'ECMA-182 standard for 64-bit CRC.' },
    { name: 'Jones (95AC9329AC4BC9B5)', tap: '95AC9329AC4BC9B5', desc: 'Another primitive polynomial.' },
    { name: 'ISO 3309 (000000000000001B)', tap: '000000000000001B', desc: 'Used in HDLC.' }
  ];

  // Parameter State
  // LCG
  a = signal(1664525);
  c = signal(1013904223);
  m = signal(4294967296);
  seed = signal(12345);
  // Multi-seed / others
  seed2 = signal(54321);
  seed3 = signal(9999);
  seed4 = signal(10101);
  stringSeed = signal('EntropyOracle');
  // Fibonacci
  fibSeed1 = signal(0);
  fibSeed2 = signal(1);
  // Chaos
  floatSeed = signal(0.5);
  paramR = signal(3.99); // r or mu
  paramA = signal(1.4); // Henon A, Ikeda U, Lorenz Sigma, Rossler a
  paramB = signal(0.3); // Henon B, Lorenz Rho, Rossler b
  paramC = signal(2.66); // Lorenz Beta, Rossler c
  paramDt = signal(0.01); // Time step
  // LFSR
  hexTap = signal('B400');

  sequence = signal<number[]>([]);
  sequenceString = computed(() => this.sequence().join(', '));
  copyStatus = signal('Copy');

  constructor(private injector: Injector) {}

  ngAfterViewInit() {
    this.drawChaos();
  }

  setCategory(cat: GenCategory) {
    this.activeCategory.set(cat);
    // Auto-select first in category
    const first = this.algorithms.find(a => a.category === cat);
    if (first) this.setMode(first.id);
    
    if (cat === 'Chaotic') {
      setTimeout(() => this.drawChaos(), 100);
    }
  }

  setMode(id: string) {
    this.mode.set(id);
    this.sequence.set([]);
    this.chiResult.set(null);
    this.dieharderResults.set([]);
    this.setDefaultParams(id);
    if (this.activeCategory() === 'Chaotic') {
      setTimeout(() => this.drawChaos(), 50);
    }
  }

  updateHexTap(event: Event, presets?: LfsrPreset[]) {
    const val = (event.target as HTMLSelectElement).value;
    this.hexTap.set(val);
  }

  getLfsrDesc(presets: LfsrPreset[]) {
    const current = presets.find(p => p.tap === this.hexTap());
    return current ? current.desc : 'Custom or unrecognized tap mask';
  }

  private getSecureRandomFloat(): number {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] / 0xFFFFFFFF;
  }

  private getSecureRandomInt(min: number, max: number): number {
    const range = max - min + 1;
    if (range <= 0) return min;
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return min + (array[0] % range);
  }

  randomizeLCGParams() {
    // Generate valid but random LCG parameters
    // Secure random selection of common moduli
    const mods = [2147483647, 4294967296, 65537, 2147483648]; 
    const randIndex = this.getSecureRandomInt(0, mods.length - 1);
    const randomM = mods[randIndex];
    this.m.set(randomM);

    // a must be < m
    let randomA = this.getSecureRandomInt(1, randomM - 1);
    
    // Decide if c is 0 (Multiplicative) or not (Mixed)
    // 50/50 chance
    const isMultiplicative = this.getSecureRandomInt(0, 1) === 1;
    
    if (isMultiplicative) {
       this.c.set(0);
       // Ensure a is coprime to m for max period in MLCG (if m is prime, almost all are, but check anyway)
       let maxRetries = 100;
       while (this.gcd(randomA, randomM) !== 1 && maxRetries-- > 0) {
          randomA = this.getSecureRandomInt(1, randomM - 1);
       }
       // Seed cannot be 0 for MLCG
       let randomSeed = this.getSecureRandomInt(1, randomM - 1);
       this.seed.set(randomSeed);
    } else {
       // Mixed LCG
       const randomC = this.getSecureRandomInt(1, randomM - 1);
       this.c.set(randomC);
       // We'll just pick a random seed
       this.seed.set(this.getSecureRandomInt(0, randomM - 1));
    }
    this.a.set(randomA);
  }

  randomizeCurrent() {
    const mode = this.mode();
    
    // Secure random buffer for general use (enough for 4 32-bit ints)
    const arr = new Uint32Array(4);
    window.crypto.getRandomValues(arr);

    switch(mode) {
      // LCG Family
      case 'lcg': case 'minstd': case 'carbon': case 'ggn': case 'randu': case 'zx81': case 'nr':
          this.randomizeLCGParams();
          break;
      
      // Single Seed Integer
      case 'xorshift': case 'mersenne': case 'splitmix': case 'mulberry': case 'middleSquare': case 'xorshift1024':
          // Ensure non-zero
          this.seed.set(arr[0] === 0 ? 12345 : arr[0]);
          break;
      case 'mwc64x':
          this.seed.set(arr[0] || 1); 
          break;
      case 'pcg-mcg':
          // PCG-MCG state must be odd
          this.seed.set((arr[0] % 2 === 0) ? arr[0] + 1 : arr[0]);
          break;
      
      // Multi Seeds
      case 'xoroshiro': case 'xoroshiro128pp': case 'pcg': case 'pcg-spc': case 'pcg-rxs-m-xs': case 'pcg-xsl-rr':
          this.seed.set(arr[0]);
          if (['pcg-spc', 'pcg-rxs-m-xs'].includes(mode)) {
             // Increment must be odd
             const s2 = arr[1];
             this.seed2.set(s2 % 2 === 0 ? s2 + 1 : s2);
          } else {
             this.seed2.set(arr[1]);
          }
          break;
      
      case 'tausworthe': case 'sfc32': case 'wichmann':
          // Tausworthe seeds > 128 recommended
          this.seed.set(arr[0] > 128 ? arr[0] : arr[0] + 128);
          this.seed2.set(arr[1] > 128 ? arr[1] : arr[1] + 128);
          this.seed3.set(arr[2] > 128 ? arr[2] : arr[2] + 128);
          break;
      
      case 'xoroshiro256': case 'sfmt': case 'pcg-aes':
          this.seed.set(arr[0]);
          this.seed2.set(arr[1]);
          this.seed3.set(arr[2]);
          this.seed4.set(arr[3]);
          break;
      
      case 'fib':
          this.fibSeed1.set(arr[0] % 100);
          this.fibSeed2.set(arr[1] % 100);
          break;
      
      case 'lagfib':
          this.seed.set(arr[0] || 123);
          break;

      // Chaotic
      case 'logistic': case 'tent': case 'henon': case 'ikeda': {
          let val = parseFloat(this.getSecureRandomFloat().toFixed(5));
          if (val <= 0.01) val = 0.02;
          if (val >= 0.99) val = 0.98;
          this.floatSeed.set(val);
          setTimeout(() => this.drawChaos(), 10);
          break;
      }
      
      case 'lorenz': {
          // Range roughly -10 to 10
          const r = this.getSecureRandomFloat();
          const x = (r * 20) - 10;
          this.floatSeed.set(Number(x.toFixed(4)));
          setTimeout(() => this.drawChaos(), 10);
          break;
      }
      
      case 'rossler': {
          // Range roughly -5 to 5
          const r = this.getSecureRandomFloat();
          const x = (r * 10) - 5;
          this.floatSeed.set(Number(x.toFixed(4)));
          setTimeout(() => this.drawChaos(), 10);
          break;
      }
          
      case 'lfsr': case 'lfsr8': case 'lfsr32': case 'lfsr64':
          this.seed.set(arr[0] === 0 ? 1 : arr[0]);
          if (mode === 'lfsr64') {
             // Combine two 32-bit ints for a large seed string
             const bigSeed = BigInt(arr[0]) + (BigInt(arr[1]) << 32n);
             this.stringSeed.set(bigSeed.toString());
          }
          break;
    }
  }

  randomizeAesSeed() {
    const vals = new Uint32Array(4);
    window.crypto.getRandomValues(vals);
    this.seed.set(vals[0]);
    this.seed2.set(vals[1]);
    this.seed3.set(vals[2]);
    this.seed4.set(vals[3]);
  }

  randomizeFloat(propName: string) {
     const formatted = parseFloat(this.getSecureRandomFloat().toFixed(5));
     let final = formatted;
     if (final <= 0) final = 0.01;
     if (final >= 1) final = 0.99;
     
     if (this[propName] && typeof this[propName].set === 'function') {
      this[propName].set(final);
    }
  }

  setDefaultParams(id: string) {
    // LCG / MLCG Family
    if (id === 'randu') { this.a.set(65539); this.c.set(0); this.m.set(2147483648); this.seed.set(1); }
    if (id === 'zx81') { this.a.set(75); this.c.set(74); this.m.set(65537); this.seed.set(123); }
    if (id === 'lcg') { this.a.set(1664525); this.c.set(1013904223); this.m.set(4294967296); this.seed.set(12345); }
    if (id === 'nr') { this.a.set(1664525); this.c.set(1013904223); this.m.set(4294967296); this.seed.set(12345); }
    if (id === 'minstd') { this.a.set(48271); this.c.set(0); this.m.set(2147483647); this.seed.set(12345); }
    if (id === 'carbon') { this.a.set(16807); this.c.set(0); this.m.set(2147483647); this.seed.set(3); }
    if (id === 'ggn') { this.a.set(16807); this.c.set(0); this.m.set(2147483647); this.seed.set(12345); }
    if (id === 'mwc64x') { this.seed.set(1234567890); }

    // Shift / Modern
    if (id === 'xoroshiro') { this.seed.set(123456789); this.seed2.set(987654321); }
    if (id === 'xoroshiro128pp') { this.seed.set(123); this.seed2.set(456); }
    if (id === 'xoroshiro256') { this.seed.set(123); this.seed2.set(456); this.seed3.set(789); this.seed4.set(101112); }
    if (id === 'tausworthe') { this.seed.set(12345); this.seed2.set(67890); this.seed3.set(54321); }
    if (id === 'lfsr8') { this.seed.set(0x1F); this.hexTap.set('1D'); }
    if (id === 'lfsr') { this.seed.set(0xACE1); this.hexTap.set('B400'); }
    if (id === 'lfsr32') { this.seed.set(0x12345678); this.hexTap.set('80200003'); } 
    if (id === 'lfsr64') { this.stringSeed.set('1234567890123456789'); this.hexTap.set('D800000000000000'); }
    if (id === 'splitmix') { this.seed.set(1234567890); }
    if (id === 'mulberry') { this.seed.set(12345); }
    if (id === 'sfc32') { this.seed.set(1); this.seed2.set(2); this.seed3.set(3); }
    if (id === 'pcg') { this.seed.set(42); this.seed2.set(54); }
    if (id === 'pcg-mcg') { this.seed.set(123456789 | 1); } 
    if (id === 'pcg-spc') { this.seed.set(123456789); this.seed2.set(1442695040888963407 | 1); } 
    if (id === 'pcg-rxs-m-xs') { this.seed.set(123456789); this.seed2.set(1442695040888963407 | 1); } 
    if (id === 'pcg-xsl-rr') { this.seed.set(123456789); this.seed2.set(987654321); } 
    if (id === 'pcg-aes') { this.seed.set(0x2b7e1516); this.seed2.set(0x28aed2a6); this.seed3.set(0xabf71588); this.seed4.set(0x09cf4f3c); } 
    if (id === 'sfmt') { this.seed.set(1234); this.seed2.set(5678); this.seed3.set(9101); this.seed4.set(1121); }
    if (id === 'xorshift1024') { this.seed.set(123456789); }

    // Classical / Chaos
    if (id === 'logistic') { this.floatSeed.set(0.5); this.paramR.set(3.99); }
    if (id === 'tent') { this.floatSeed.set(0.4); this.paramR.set(1.99); }
    if (id === 'henon') { this.floatSeed.set(0.1); this.paramA.set(1.4); this.paramB.set(0.3); }
    if (id === 'ikeda') { this.floatSeed.set(0.1); this.paramA.set(0.9); }
    if (id === 'lorenz') { this.floatSeed.set(0.1); this.paramA.set(10); this.paramB.set(28); this.paramC.set(2.66); this.paramDt.set(0.01); }
    if (id === 'rossler') { this.floatSeed.set(0.1); this.paramA.set(0.2); this.paramB.set(0.2); this.paramC.set(5.7); this.paramDt.set(0.05); }
    if (id === 'wichmann') { this.seed.set(100); this.seed2.set(200); this.seed3.set(300); }
    if (id === 'lagfib') { this.seed.set(12345); this.m.set(1000); }
    if (id === 'rule30') { this.seed.set(123456); }
  }

  objectKeys(obj: Record<string, string>) {
    return Object.keys(obj);
  }

  hasErrors() {
    return Object.keys(this.currentErrors()).length > 0;
  }

  // Helper for GCD
  gcd(a: number, b: number): number {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { [a, b] = [b, a % b]; }
    return a;
  }

  generate() {
    this.chiResult.set(null);
    this.dieharderResults.set([]);
    if (this.hasErrors()) return;
    
    // Generate visible sequence based on 'count'
    const result = this.generateInternalSequence(this.count() ?? 10);
    this.sequence.set(result);
  }

  generateInternalSequence(limit: number): number[] {
    const result: number[] = [];
    const mode = this.mode();
    
    const seedVal = this.seed() ?? 0;
    const seedVal2 = this.seed2() ?? 0;
    const seedVal3 = this.seed3() ?? 0;
    const seedVal4 = this.seed4() ?? 0;
    const aVal = this.a() ?? 0;
    const cVal = this.c() ?? 0;
    const mVal = this.m() ?? 1;

    try {
      if (['lcg', 'randu', 'zx81', 'nr', 'minstd', 'carbon', 'ggn'].includes(mode)) {
          let current = seedVal;
          const valA = aVal;
          const valC = cVal;
          const valM = mVal;
          
          for (let i = 0; i < limit; i++) {
            result.push(current);
            const safeM = valM === 0 ? 1 : valM;
            const next = (BigInt(valA) * BigInt(current) + BigInt(valC)) % BigInt(safeM);
            current = Number(next);
          }
      }
      else if (mode === 'tausworthe') {
          let s1 = seedVal, s2 = seedVal2, s3 = seedVal3;
          for(let i=0; i<limit; i++) {
             const b1 = (((s1 << 13) ^ s1) >>> 19);
             s1 = (((s1 & 0xFFFFFFFE) << 12) ^ b1);
             const b2 = (((s2 << 2) ^ s2) >>> 25);
             s2 = (((s2 & 0xFFFFFFF8) << 4) ^ b2);
             const b3 = (((s3 << 3) ^ s3) >>> 11);
             s3 = (((s3 & 0xFFFFFFF0) << 17) ^ b3);
             result.push((s1 ^ s2 ^ s3) >>> 0);
          }
      }
      else if (mode === 'lfsr8') {
         let lfsr = seedVal & 0xFF;
         const tap = parseInt(this.hexTap() || '1D', 16);
         for(let i=0; i<limit; i++) {
            result.push(lfsr);
            const lsb = lfsr & 1;
            lfsr >>= 1;
            if (lsb) lfsr ^= tap;
         }
      }
      else if (mode === 'lfsr' || mode === 'lfsr32') {
         const bits = mode === 'lfsr' ? 16 : 32;
         let lfsr = seedVal;
         const tapStr = this.hexTap() || (mode === 'lfsr' ? 'B400' : '80200003');
         const tap = parseInt(tapStr, 16);
         // Simplified check
         for(let i=0; i<limit; i++) {
            result.push(lfsr >>> 0);
            const lsb = lfsr & 1;
            lfsr >>>= 1;
            if (lsb) lfsr ^= tap;
         }
      }
      else if (mode === 'lfsr64') {
         let lfsr = BigInt(this.stringSeed() || "12345");
         const tapStr = this.hexTap() || "D800000000000000";
         const tap = BigInt("0x" + tapStr);
         for(let i=0; i<limit; i++) {
            result.push(Number(lfsr & 0xFFFFFFFFn));
            const lsb = lfsr & 1n;
            lfsr >>= 1n;
            if (lsb) lfsr ^= tap;
         }
      }
      else if (mode === 'xorshift') {
          let x = seedVal || 123456789;
          for(let i=0; i<limit; i++) {
             x ^= x << 13;
             x ^= x >> 17;
             x ^= x << 5;
             result.push(x >>> 0);
          }
      }
      else if (mode === 'xorshift1024') {
          // Initialize state array [16] using SplitMix64 on master seed
          let z = BigInt(seedVal || 123456789);
          const s = new BigUint64Array(16);
          for(let i=0; i<16; i++) {
             z = (z + 0x9e3779b97f4a7c15n) & 0xFFFFFFFFFFFFFFFFn;
             let x = z;
             x = ((x ^ (x >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xFFFFFFFFFFFFFFFFn;
             x = ((x ^ (x >> 27n)) * 0x94d049bb133111ebn) & 0xFFFFFFFFFFFFFFFFn;
             s[i] = (x ^ (x >> 31n)) & 0xFFFFFFFFFFFFFFFFn;
          }
          let p = 0;
          for(let i=0; i<limit; i++) {
             const s0 = s[p];
             p = (p + 1) & 15;
             let s1 = s[p];
             s1 ^= (s1 << 31n) & 0xFFFFFFFFFFFFFFFFn; // shift, mask 64
             s[p] = (s1 ^ s0 ^ (s1 >> 11n) ^ (s0 >> 30n)) & 0xFFFFFFFFFFFFFFFFn;
             const val = (s[p] * 1181783497276652981n) & 0xFFFFFFFFFFFFFFFFn;
             result.push(Number(val & 0xFFFFFFFFn)); // Return low 32 bits
          }
      }
      else if (mode === 'splitmix') {
          let x = BigInt(seedVal || 123456789);
          for(let i=0; i<limit; i++) {
             x = (x + BigInt("0x9E3779B97F4A7C15")) & 0xFFFFFFFFFFFFFFFFn;
             let z = x;
             z = (z ^ (z >> 30n)) * BigInt("0xBF58476D1CE4E5B9");
             z = (z ^ (z >> 27n)) * BigInt("0x94D049BB133111EB");
             z = z ^ (z >> 31n);
             result.push(Number(z & 0xFFFFFFFFn));
          }
      }
      else if (mode === 'mulberry') {
          let state = seedVal || 12345;
          for(let i=0; i<limit; i++) {
             state = (state + 0x6D2B79F5) | 0;
             let t = Math.imul(state ^ (state >>> 15), 1 | state);
             t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
             result.push((t ^ (t >>> 14)) >>> 0);
          }
      }
      else if (mode === 'henon') {
          let x = this.floatSeed() ?? 0.1;
          let y = 0.1; 
          const a = this.paramA() ?? 1.4;
          const b = this.paramB() ?? 0.3;
          for(let i=0; i<limit; i++) {
              result.push(Number(x.toFixed(5)));
              const nextX = 1 - a * x * x + y;
              const nextY = b * x;
              x = nextX;
              y = nextY;
          }
      }
      else if (mode === 'ikeda') {
          let x = this.floatSeed() ?? 0.1;
          let y = 0.1;
          const u = this.paramA() ?? 0.9;
          for(let i=0; i<limit; i++) {
              result.push(Number(x.toFixed(5)));
              const t = 0.4 - 6 / (1 + x*x + y*y);
              const nextX = 1 + u * (x * Math.cos(t) - y * Math.sin(t));
              const nextY = u * (x * Math.sin(t) + y * Math.cos(t));
              x = nextX;
              y = nextY;
          }
      }
      else if (mode === 'lorenz') {
          let x = this.floatSeed() ?? 0.1;
          let y = 1.0, z = 1.0;
          const sigma = this.paramA() ?? 10.0;
          const rho = this.paramB() ?? 28.0;
          const beta = this.paramC() ?? 2.666;
          const dt = this.paramDt() ?? 0.01;
          
          for(let i=0; i<limit; i++) {
              result.push(Number(x.toFixed(4)));
              const dx = sigma * (y - x);
              const dy = x * (rho - z) - y;
              const dz = x * y - beta * z;
              x += dx * dt;
              y += dy * dt;
              z += dz * dt;
          }
      }
      else if (mode === 'rossler') {
          let x = this.floatSeed() ?? 0.1;
          let y = 1.0, z = 1.0;
          const a = this.paramA() ?? 0.2;
          const b = this.paramB() ?? 0.2;
          const c = this.paramC() ?? 5.7;
          const dt = this.paramDt() ?? 0.05;
          
          for(let i=0; i<limit; i++) {
              result.push(Number(x.toFixed(4)));
              const dx = -y - z;
              const dy = x + a * y;
              const dz = b + z * (x - c);
              x += dx * dt;
              y += dy * dt;
              z += dz * dt;
          }
      }
      else if (['logistic', 'tent'].includes(mode)) {
          let x = this.floatSeed() ?? 0.5;
          const param = this.paramR() ?? (mode === 'logistic' ? 3.99 : 1.99);
          for(let i=0; i<limit; i++) {
             result.push(Number(x.toFixed(5)));
             if (mode === 'logistic') x = param * x * (1 - x);
             else x = (x < 0.5) ? param * x : param * (1 - x);
          }
      }
      else if (mode === 'fib') {
          let f1 = this.fibSeed1() ?? 0;
          let f2 = this.fibSeed2() ?? 1;
          result.push(f1);
          if (limit > 1) result.push(f2);
          for(let i=2; i<limit; i++) {
             const next = f1 + f2;
             result.push(next);
             f1 = f2;
             f2 = next;
          }
      }
      else {
          // Default Fallback
          for(let i=0; i<limit; i++) {
             result.push(Math.floor(Math.random() * 100));
          }
      }
    } catch (e) {
      console.error(e);
    }
    
    return result;
  }
  
  onCanvasClick(event: MouseEvent) {
    if (this.activeCategory() !== 'Chaotic') return;
    const canvas = this.chaosCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const width = rect.width;
    
    if (['logistic', 'tent'].includes(this.mode())) {
        const rMin = (this.mode() === 'logistic') ? 2.0 : 1.0;
        const rMax = (this.mode() === 'logistic') ? 4.0 : 2.0;
        const ratio = x / width;
        this.paramR.set(parseFloat((rMin + ratio * (rMax - rMin)).toFixed(4)));
        this.drawChaos();
    }
  }

  drawChaos() {
    const canvas = this.chaosCanvas?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    ctx.fillStyle = '#050b14';
    ctx.fillRect(0, 0, width, height);
    
    const mode = this.mode();
    
    if (mode === 'logistic' || mode === 'tent') {
        ctx.fillStyle = 'rgba(168, 85, 247, 0.4)'; // Purple
        const rMin = (mode === 'logistic') ? 2.0 : 1.0;
        const rMax = (mode === 'logistic') ? 4.0 : 2.0;
        
        for (let px = 0; px < width; px++) {
            const r = rMin + (px / width) * (rMax - rMin);
            let x = 0.5;
            for (let i = 0; i < 50; i++) {
                if (mode === 'logistic') x = r * x * (1 - x);
                else x = (x < 0.5) ? r * x : r * (1 - x);
            }
            for (let i = 0; i < 30; i++) {
                if (mode === 'logistic') x = r * x * (1 - x);
                else x = (x < 0.5) ? r * x : r * (1 - x);
                const py = height - (x * height);
                ctx.fillRect(px, py, 1, 1);
            }
        }

        // Draw indicator line for current parameter
        const currentR = this.paramR() ?? (mode === 'logistic' ? 3.99 : 1.99);
        if (currentR >= rMin && currentR <= rMax) {
            const lineX = ((currentR - rMin) / (rMax - rMin)) * width;
            ctx.strokeStyle = '#22d3ee'; // Cyan 400
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(lineX, 0);
            ctx.lineTo(lineX, height);
            ctx.stroke();
        }

    } else {
        // 2D Phase Plots
        ctx.fillStyle = (mode === 'henon') ? 'rgba(139, 92, 246, 0.6)' : 
                        (mode === 'lorenz' || mode === 'rossler') ? 'rgba(34, 211, 238, 0.4)' : 'rgba(34, 211, 238, 0.6)';
        
        const offX = width / 2;
        const offY = height / 2;
        let scaleX = width / 4;
        let scaleY = height / 2;

        if (mode === 'henon' || mode === 'ikeda') {
            let x = this.floatSeed() ?? 0.1;
            let y = 0.1;
            const a = this.paramA() ?? (mode === 'henon' ? 1.4 : 0.9);
            const b = this.paramB() ?? 0.3;

            for(let i=0; i<2000; i++) {
                if (mode === 'henon') {
                    const nextX = 1 - a * x * x + y;
                    const nextY = b * x;
                    x = nextX;
                    y = nextY;
                } else { // ikeda
                     const t = 0.4 - 6 / (1 + x*x + y*y);
                     const nextX = 1 + a * (x * Math.cos(t) - y * Math.sin(t));
                     const nextY = a * (x * Math.sin(t) + y * Math.cos(t));
                     x = nextX;
                     y = nextY;
                }
                ctx.fillRect(offX + x * scaleX, offY - y * scaleY, 1, 1);
            }
        } else if (mode === 'lorenz' || mode === 'rossler') {
            let x = this.floatSeed() ?? 0.1;
            let y = 1.0, z = 1.0;
            const pa = this.paramA() ?? (mode === 'lorenz' ? 10 : 0.2);
            const pb = this.paramB() ?? (mode === 'lorenz' ? 28 : 0.2);
            const pc = this.paramC() ?? (mode === 'lorenz' ? 2.66 : 5.7);
            const dt = this.paramDt() ?? (mode === 'lorenz' ? 0.01 : 0.05);
            
            // Adjust scales for 3D projections
            scaleX = (mode === 'lorenz') ? 8 : 10; 
            scaleY = (mode === 'lorenz') ? 4 : 10; 
            const shiftY = (mode === 'lorenz') ? 0 : height/3;

            // Warmup
            for(let i=0; i<100; i++) {
                if (mode === 'lorenz') {
                    let dx = pa * (y - x); let dy = x * (pb - z) - y; let dz = x * y - pc * z;
                    x += dx*dt; y += dy*dt; z += dz*dt;
                } else {
                    let dx = -y-z; let dy = x + pa*y; let dz = pb + z*(x-pc);
                    x += dx*dt; y += dy*dt; z += dz*dt;
                }
            }

            for(let i=0; i<3000; i++) {
               if (mode === 'lorenz') {
                    let dx = pa * (y - x);
                    let dy = x * (pb - z) - y;
                    let dz = x * y - pc * z;
                    x += dx * dt;
                    y += dy * dt;
                    z += dz * dt;
                    // Plot X vs Z (Standard Butterfly view)
                    ctx.fillRect(offX + x * scaleX, height - (z * scaleY), 1, 1);
               } else {
                    let dx = -y - z;
                    let dy = x + pa * y;
                    let dz = pb + z * (x - pc);
                    x += dx * dt;
                    y += dy * dt;
                    z += dz * dt;
                    // Plot X vs Y
                    ctx.fillRect(offX + x * scaleX, offY - y * scaleY + shiftY, 1, 1);
               }
            }
        }
    }
  }

  copyToClipboard() {
      navigator.clipboard.writeText(this.sequenceString()).then(() => {
          this.copyStatus.set('Copied!');
          setTimeout(() => this.copyStatus.set('Copy'), 2000);
      });
  }

  reset() {
      this.setMode(this.mode());
      this.count.set(10);
  }

  performChiSquared() {
      const seq = this.sequence();
      if (!seq.length) return;
      
      const bins = 10;
      const observed = new Array(bins).fill(0);
      const isFloat = seq.some(n => !Number.isInteger(n));
      
      for (const val of seq) {
          let binIndex = 0;
          if (isFloat) {
              binIndex = Math.floor((Math.abs(val) % 1) * bins);
          } else {
              // Simple hash-like binning for large ints if range unknown
              // Better approach: mod 10 of last digit or similar for distribution
              // Here: Normalized approx using 0-9 last digit
              binIndex = Math.abs(val) % 10;
          }
          if (binIndex < 0) binIndex = 0;
          if (binIndex >= bins) binIndex = bins - 1;
          observed[binIndex]++;
      }
      
      const expected = seq.length / bins;
      let chiSq = 0;
      for (let i = 0; i < bins; i++) {
          chiSq += Math.pow(observed[i] - expected, 2) / expected;
      }
      
      this.chiResult.set({
          score: chiSq,
          passed: chiSq < 16.92
      });
  }
  
  performDieharder() {
      // Use extended generation for better statistical relevance
      const testSeq = this.generateInternalSequence(Math.max(this.testLimit(), 1000));
      const n = testSeq.length;
      if (n < 10) return;
      
      const results: TestResult[] = [];
      const min = Math.min(...testSeq);
      const max = Math.max(...testSeq);
      const range = (max - min) || 1;
      
      // Normalize to 0-1 for general testing
      const normalized = testSeq.map(x => (x - min) / range);

      // 1. Monobit Test (using high bit approximation by checking > 0.5)
      let ones = 0;
      for(const val of normalized) {
          if (val >= 0.5) ones++;
      }
      const prop = ones / n;
      // Z-score: (p - 0.5) / sqrt(0.25/n)
      const monobitScore = Math.abs((prop - 0.5) / (0.5 / Math.sqrt(n)));
      results.push({
          name: 'Monobit (Balance)',
          score: monobitScore,
          status: monobitScore < 1.96 ? 'PASS' : (monobitScore < 2.576 ? 'SUSPECT' : 'FAIL'),
          desc: 'Checks 0/1 balance. Z-score < 1.96 passes.'
      });
      
      // 2. Runs Test (Up/Down)
      let runs = 1;
      for(let i=1; i<n; i++) {
          if ((testSeq[i] > testSeq[i-1]) !== (testSeq[i-1] > testSeq[i-2])) runs++;
      }
      const expectedRuns = (2 * n - 1) / 3;
      const runsVar = (16 * n - 29) / 90;
      const runsScore = Math.abs(runs - expectedRuns) / Math.sqrt(runsVar);
      
      results.push({
          name: 'Runs (Up/Down)',
          score: runsScore,
          status: runsScore < 2 ? 'PASS' : (runsScore < 3 ? 'SUSPECT' : 'FAIL'),
          desc: 'Checks sequential patterns. Z-score < 2 passes.'
      });

      // 3. Monte Carlo Pi Approximation
      // Use pairs (x, y) from the sequence
      let insideCircle = 0;
      const pairs = Math.floor(n / 2);
      for(let i=0; i<pairs; i++) {
          const x = normalized[2*i];
          const y = normalized[2*i+1];
          if (x*x + y*y <= 1) insideCircle++;
      }
      const piEst = 4 * (insideCircle / pairs);
      const piError = Math.abs(Math.PI - piEst);
      const piScore = (piError / Math.PI) * 100; // Percent Error
      
      results.push({
          name: 'Monte Carlo Pi',
          score: piScore,
          displayValue: `π ≈ ${piEst.toFixed(4)}`,
          status: piScore < 2.0 ? 'PASS' : (piScore < 5.0 ? 'SUSPECT' : 'FAIL'),
          desc: `Geometric test. Est: ${piEst.toFixed(4)}. Err: ${piScore.toFixed(2)}%`
      });

      // 4. Autocorrelation (Lag-1)
      const mean = normalized.reduce((a,b) => a+b, 0) / n;
      let num = 0;
      let den = 0;
      for(let i=0; i<n-1; i++) {
          num += (normalized[i] - mean) * (normalized[i+1] - mean);
          den += Math.pow(normalized[i] - mean, 2);
      }
      // Handling den=0 case (constant sequence)
      const correlation = den === 0 ? 1 : num / den;
      // Ideally 0. 95% Confidence interval approx +/- 1.96/sqrt(n)
      const confInterval = 1.96 / Math.sqrt(n);
      const absCorr = Math.abs(correlation);
      
      results.push({
          name: 'Autocorrelation',
          score: absCorr,
          status: absCorr < confInterval ? 'PASS' : (absCorr < confInterval * 1.5 ? 'SUSPECT' : 'FAIL'),
          desc: `Lag-1 correlation: ${correlation.toFixed(4)}. Ideal: 0.`
      });
      
      this.dieharderResults.set(results);
  }
}
