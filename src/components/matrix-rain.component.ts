
import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, signal } from '@angular/core';

@Component({
  selector: 'app-matrix-rain',
  standalone: true,
  template: `
    <canvas #canvas class="fixed top-0 left-0 w-full h-full pointer-events-none opacity-20 z-0"></canvas>
  `
})
export class MatrixRainComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private intervalId: any;

  ngAfterViewInit() {
    this.initMatrix();
    window.addEventListener('resize', () => this.initMatrix());
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
    window.removeEventListener('resize', () => this.initMatrix());
  }

  private initMatrix() {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const columns = Math.floor(canvas.width / 20);
    const drops: number[] = new Array(columns).fill(1);
    
    // Hex characters + binary
    const chars = '0123456789ABCDEF';

    if (this.intervalId) clearInterval(this.intervalId);

    this.intervalId = setInterval(() => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.05)'; // Fade effect
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#0ea5e9'; // Sky blue/Cyan
      ctx.font = '15px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = chars.charAt(Math.floor(Math.random() * chars.length));
        ctx.fillText(text, i * 20, drops[i] * 20);

        if (drops[i] * 20 > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }, 50);
  }
}
