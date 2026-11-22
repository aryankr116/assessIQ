const scenes = {
  profiles: (
    <>
      <rect x="25" y="13" width="50" height="39" rx="4" fill="#342D27" stroke="#74685C" />
      <circle cx="41" cy="29" r="8" fill="#C45B3D" />
      <path d="M30 47c1.8-6 5.5-9 11-9s9.2 3 11 9" fill="#C45B3D" fillOpacity=".55" />
      <path d="M57 25h12M57 31h9" stroke="#D9CCBA" strokeWidth="2" strokeLinecap="round" />
      <rect x="60" y="9" width="43" height="39" rx="4" fill="#211B17" stroke="#74685C" />
      <circle cx="75" cy="24" r="7" fill="#D8B36E" fillOpacity=".8" />
      <path d="M66 42c1.5-5 4.5-7.5 9-7.5s7.5 2.5 9 7.5M87 20h9M87 26h7" stroke="#D9CCBA" strokeWidth="2" strokeLinecap="round" />
      <circle cx="106" cy="44" r="3" fill="#D8B36E" />
    </>
  ),
  documents: (
    <>
      <path d="M31 22h25l6 6h37v25H31V22Z" fill="#C45B3D" fillOpacity=".22" stroke="#C45B3D" />
      <path d="M43 13h25l10 10v30H43V13Z" fill="#342D27" stroke="#74685C" />
      <path d="M68 13v11h10M51 31h19M51 37h15M51 43h19" stroke="#D9CCBA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M31 31h68l-5 22H36l-5-22Z" fill="#893A2A" fillOpacity=".75" stroke="#D98F76" strokeOpacity=".6" />
      <circle cx="103" cy="15" r="3" fill="#D8B36E" />
    </>
  ),
  questions: (
    <>
      <path d="M29 15a7 7 0 0 1 7-7h42a7 7 0 0 1 7 7v17a7 7 0 0 1-7 7H56l-10 8v-8h-10a7 7 0 0 1-7-7V15Z" fill="#342D27" stroke="#74685C" />
      <circle cx="46" cy="24" r="2.5" fill="#D8B36E" />
      <circle cx="58" cy="24" r="2.5" fill="#D8B36E" />
      <circle cx="70" cy="24" r="2.5" fill="#D8B36E" />
      <path d="M55 38a6 6 0 0 1 6-6h34a6 6 0 0 1 6 6v11a6 6 0 0 1-6 6H78l-8 6v-6h-9a6 6 0 0 1-6-6V38Z" fill="#A84431" />
      <path d="M67 43h20M67 48h13" stroke="#FBF8F1" strokeOpacity=".9" strokeWidth="2" strokeLinecap="round" />
      <path d="m101 11 2.5 5.5L109 19l-5.5 2.5L101 27l-2.5-5.5L93 19l5.5-2.5L101 11Z" fill="#D8B36E" />
    </>
  ),
  results: (
    <>
      <rect x="39" y="11" width="50" height="44" rx="4" fill="#342D27" stroke="#74685C" />
      <rect x="53" y="7" width="22" height="9" rx="4.5" fill="#A84431" />
      <rect x="48" y="23" width="8" height="8" rx="2.5" fill="#C45B3D" />
      <path d="m50 27 2 2 4-5M62 27h18" stroke="#F0E7D7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="48" y="36" width="8" height="8" rx="2.5" fill="#C45B3D" />
      <path d="m50 40 2 2 4-5M62 40h14" stroke="#F0E7D7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="97" cy="20" r="7" fill="#D8B36E" fillOpacity=".18" />
      <path d="m97 15 1.5 3.5L102 20l-3.5 1.5L97 25l-1.5-3.5L92 20l3.5-1.5L97 15Z" fill="#D8B36E" />
    </>
  ),
  people: (
    <>
      <rect x="31" y="14" width="66" height="40" rx="4" fill="#342D27" stroke="#74685C" />
      <circle cx="51" cy="29" r="8" fill="#C45B3D" />
      <circle cx="76" cy="29" r="8" fill="#D8B36E" fillOpacity=".8" />
      <path d="M38 47c1.5-6 5.8-9 13-9s11.5 3 13 9M63 47c1.5-6 5.8-9 13-9s11.5 3 13 9" stroke="#D9CCBA" strokeWidth="2" strokeLinecap="round" />
      <circle cx="101" cy="17" r="3" fill="#D8B36E" />
    </>
  ),
};

export default function PageDoodle({ variant }) {
  const scene = scenes[variant];
  if (!scene) return null;

  return (
    <div aria-hidden="true" className="absolute left-1/2 top-1/2 hidden h-[58px] w-[116px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] xl:flex">
      <svg viewBox="0 0 128 64" className="h-full w-full" fill="none">
        <rect x=".5" y=".5" width="127" height="63" rx="11.5" stroke="white" strokeOpacity=".035" />
        {scene}
      </svg>
    </div>
  );
}
