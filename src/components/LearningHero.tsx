import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, BookOpen, GraduationCap, MessageCircle, Check, Sparkles } from 'lucide-react';

export type LearningGoal = 'school' | 'ielts' | 'conversation';
const goals = [
  { id: 'school' as const, icon: GraduationCap, label: 'Tiếng Anh học đường', level: 'A2 · Củng cố nền tảng', text: 'Vững ngữ pháp, nhớ từ lâu hơn và tự tin với mỗi câu tiếng Anh.' },
  { id: 'ielts' as const, icon: BookOpen, label: 'Nền tảng IELTS', level: 'B2 · Mở rộng cách diễn đạt', text: 'Luyện dịch và tích lũy từ vựng để chuẩn bị cho hành trình IELTS.' },
  { id: 'conversation' as const, icon: MessageCircle, label: 'Giao tiếp mỗi ngày', level: 'B1 · Tình huống quen thuộc', text: 'Tập diễn đạt ý tưởng, nghe phát âm và xây dựng phản xạ từng ngày.' },
];

function LearningOrbit() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let disposed = false;
    let cleanup = () => {};
    // Load the decorative scene separately from the lesson bundle.
    import('three').then(THREE => {
      if (disposed) return;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); }
      catch { return; } // The CSS globe remains visible without WebGL.
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
      camera.position.z = 7;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      element.appendChild(renderer.domElement);
      const group = new THREE.Group();
      scene.add(group);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x4657a8, 3));
      const light = new THREE.DirectionalLight(0xffffff, 4);
      light.position.set(3, 4, 5); scene.add(light);
      const globe = new THREE.Mesh(new THREE.SphereGeometry(1.36, 40, 28), new THREE.MeshStandardMaterial({color: 0xb9e5e7, roughness: .35, metalness: .15}));
      group.add(globe);
      const grid = new THREE.Mesh(new THREE.SphereGeometry(1.375, 20, 12), new THREE.MeshBasicMaterial({color: 0x327b80, wireframe: true, transparent: true, opacity: .23}));
      group.add(grid);
      [0, 1, 2].forEach(i => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.8 + i * .16, .018, 8, 90), new THREE.MeshBasicMaterial({color: [0x5262d6, 0xf3b977, 0x99babb][i]}));
        ring.rotation.set(.8 + i * .4, .4 + i * .6, i * .5); group.add(ring);
        const bead = new THREE.Mesh(new THREE.SphereGeometry(.13 + i * .03, 16, 12), new THREE.MeshStandardMaterial({color: [0x5d5cda, 0xffbd78, 0xffffff][i], roughness: .3}));
        bead.position.set(Math.cos(i * 2) * 1.95, Math.sin(i * 2) * 1.7, .6); group.add(bead);
      });
      const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      let visible = true, frame = 0, angle = 0;
      const draw = () => {
        frame = 0;
        if (disposed || !visible || document.hidden) return;
        if (!motion.matches) { angle += .003; group.rotation.y = angle; group.rotation.z = Math.sin(angle) * .08; }
        renderer.render(scene, camera);
        if (!motion.matches) frame = requestAnimationFrame(draw);
      };
      const restart = () => { cancelAnimationFrame(frame); draw(); };
      const resize = new ResizeObserver(() => {
        const { width, height } = element.getBoundingClientRect();
        if (!width || !height) return;
        camera.aspect = width / height; camera.updateProjectionMatrix();
        renderer.setSize(width, height); restart();
      });
      const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; restart(); });
      resize.observe(element); observer.observe(element);
      motion.addEventListener('change', restart);
      document.addEventListener('visibilitychange', restart);
      cleanup = () => {
        cancelAnimationFrame(frame); resize.disconnect(); observer.disconnect();
        motion.removeEventListener('change', restart); document.removeEventListener('visibilitychange', restart);
        group.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); (object.material as InstanceType<typeof THREE.Material>).dispose(); } });
        renderer.dispose(); renderer.domElement.remove();
      };
    }).catch(() => {});
    return () => { disposed = true; cleanup(); };
  }, []);
  return <div className="learning-orbit" aria-hidden="true"><div className="orbit-fallback" /><div className="orbit-canvas" ref={host} /><div className="orbit-label orbit-label-top"><span>✦</span> A little practice. A bigger world.</div><div className="orbit-word"><span>WORD OF THE DAY</span><strong>possibility</strong><small>/ˌpɒs.əˈbɪl.ə.ti/ · khả năng</small></div><div className="orbit-note"><Check size={15} /> Từng câu nhỏ. Tiến bộ lớn.</div></div>;
}

export function LearningHero({ onStart }: { onStart: (goal: LearningGoal) => void }) {
  const [selected, setSelected] = useState<LearningGoal>('conversation');
  return <div className="learning-welcome">
    <section className="learning-hero" aria-labelledby="learning-title">
      <div className="learning-copy">
        <div className="learning-eyebrow"><span /> YOUR NEXT CHAPTER STARTS HERE</div>
        <h1 id="learning-title">Tiếng Anh tốt hơn.<br /><em>Thế giới rộng hơn.</em></h1>
        <p>Từ lớp học đến những cuộc trò chuyện mới. Luyện từng câu, khám phá từ vựng và tự tin diễn đạt theo cách của bạn.</p>
        <div className="learning-actions"><button className="learning-primary" onClick={() => onStart(selected)}>Bắt đầu luyện tập <ArrowUpRight size={19} /></button><a href="#learning-goals">Tìm hướng học của bạn <ArrowDown size={16} /></a></div>
        <div className="learning-benefits"><span><Check size={14} /> Học theo trình độ</span><span><Check size={14} /> Nghe phát âm</span><span><Check size={14} /> Luyện tập mỗi ngày</span></div>
      </div>
      <LearningOrbit />
    </section>
    <section id="learning-goals" className="learning-goals" aria-labelledby="goals-title">
      <div className="learning-section-heading"><div><span className="learning-kicker">CHỌN ĐIỂM BẮT ĐẦU</span><h2 id="goals-title">Một mục tiêu. Một bước tiến mới.</h2></div><span className="learning-caption">Bạn luôn có thể đổi trình độ trong bài học.</span></div>
      <div className="learning-goal-grid">{goals.map(goal => <button key={goal.id} className={`learning-goal ${selected === goal.id ? 'is-selected' : ''}`} aria-pressed={selected === goal.id} onClick={() => setSelected(goal.id)}><div className="goal-card-top"><span className={`goal-icon goal-${goal.id}`}><goal.icon size={23} /></span><span className="goal-check">{selected === goal.id ? <Check size={15} /> : <ArrowUpRight size={17} />}</span></div><h3>{goal.label}</h3><p>{goal.text}</p><span className="goal-level">{goal.level}</span></button>)}</div>
      <div className="learning-goal-footer"><span><Sparkles size={15} /> IELTS: luyện nền tảng ngôn ngữ qua bài dịch, không phải bài thi thử.</span><button onClick={() => onStart(selected)}>Học theo mục tiêu đã chọn <ArrowUpRight size={16} /></button></div>
    </section>
  </div>;
}
