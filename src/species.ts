import { createKite, transformKite } from './bird.ts';
import type { BirdMesh, TransformedMesh } from './bird.ts';
import { flightPose } from './flight.ts';
import type { FlightMode, FlightPose, View } from './flight.ts';
import { createEagle, eaglePose, transformEagle } from './species/golden-eagle.ts';
import { createFalcon, falconPose, transformFalcon } from './species/peregrine-falcon.ts';

export type SpeciesId = 'swallow-tailed-kite' | 'golden-eagle' | 'peregrine-falcon';
export interface PoseStudy {
  name: string;
  detail: string;
  view: View;
  pose: Partial<FlightPose>;
}
export interface Species {
  id: SpeciesId;
  name: string;
  scientificName: string;
  englishName: string;
  number: string;
  description: string;
  story: string;
  reference: string;
  create: () => BirdMesh;
  transform: (
    mesh: BirdMesh,
    pose: FlightPose,
    output?: Float32Array,
    flat?: boolean,
  ) => TransformedMesh;
  flight: (time: number, mode?: FlightMode, seed?: number) => FlightPose;
  framing: { width: number; height: number; profileHeight: number };
  studies: readonly PoseStudy[];
}
export const SPECIES: readonly Species[] = [
  {
    id: 'swallow-tailed-kite',
    name: 'Gavião-tesoura',
    scientificName: 'Elanoides forficatus',
    englishName: 'Swallow-tailed kite',
    number: '01',
    description:
      'Asas longas e pontudas, cabeça e ventre claros e cauda preta profundamente bifurcada.',
    story:
      'Asas estreitas, penas sobrepostas e uma cauda que desenha uma tesoura no ar. A identidade deste gavião está na relação entre essas formas — e na maneira como elas se movem juntas.',
    reference: 'https://www.allaboutbirds.org/guide/Swallow-tailed_Kite/id',
    create: createKite,
    transform: transformKite,
    flight: flightPose,
    framing: { width: 6.5, height: 5.1, profileHeight: 6.3 },
    studies: [
      {
        name: 'Planar',
        detail: 'VENTRAL',
        view: 'ventral',
        pose: { yaw: -0.28, bank: 0, lift: 0, tip: 0, elbow: 0, fold: 0 },
      },
      {
        name: 'Inclinar',
        detail: '35°',
        view: 'oblique',
        pose: { yaw: 0.24, bank: 0.61, lift: 0.015, tip: 0, elbow: 0, fold: 0 },
      },
      {
        name: 'Recuperar',
        detail: 'ASAS ALTAS',
        view: 'oblique',
        pose: { yaw: -0.25, bank: 0.02, lift: 0.68, tip: -0.17, elbow: -0.09, fold: 0.15 },
      },
      {
        name: 'Impulsionar',
        detail: 'ASAS BAIXAS',
        view: 'oblique',
        pose: { yaw: 0.12, bank: 0, lift: -0.64, tip: 0.2, elbow: 0.08, fold: 0 },
      },
    ],
  },
  {
    id: 'golden-eagle',
    name: 'Águia-real',
    scientificName: 'Aquila chrysaetos',
    englishName: 'Golden eagle',
    number: '02',
    description:
      'Águia adulta de asas largas, primárias separadas, nuca dourada e cauda longa em leque.',
    story:
      'Primárias abertas como dedos, asas largas e uma nuca dourada. A águia-real sustenta um leve V no planeio, inclina o corpo em curvas amplas e abre a cauda em leque. Suas batidas têm outra amplitude e outro peso.',
    reference: 'https://www.allaboutbirds.org/guide/Golden_Eagle/id',
    create: createEagle,
    transform: transformEagle,
    flight: eaglePose,
    framing: { width: 7.8, height: 6.0, profileHeight: 6.6 },
    studies: [
      {
        name: 'Sustentar',
        detail: 'DIÉDRICO',
        view: 'ventral',
        pose: { yaw: -0.2, bank: 0, lift: 0.11, tip: -0.035, elbow: 0, fold: 0 },
      },
      {
        name: 'Circular',
        detail: '32°',
        view: 'oblique',
        pose: { yaw: 0.16, bank: 0.56, lift: 0.12, tip: -0.035, elbow: 0, fold: 0.03 },
      },
      {
        name: 'Recuperar',
        detail: 'PRIMÁRIAS ABERTAS',
        view: 'oblique',
        pose: { yaw: -0.2, bank: 0.02, lift: 0.65, tip: -0.16, elbow: -0.08, fold: 0.13 },
      },
      {
        name: 'Impulsionar',
        detail: 'BATIDA AMPLA',
        view: 'oblique',
        pose: { yaw: 0.1, bank: 0, lift: -0.61, tip: 0.17, elbow: 0.07, fold: 0 },
      },
    ],
  },
  {
    id: 'peregrine-falcon',
    name: 'Falcão-peregrino',
    scientificName: 'Falco peregrinus',
    englishName: 'Peregrine falcon',
    number: '03',
    description:
      'Falcão adulto de asas afiladas e recolhíveis, corpo compacto, capuz escuro, bigode e ventre barrado.',
    story:
      'Um corpo compacto entre asas afiladas. O capuz e o bigode escuros encontram o peito claro e barrado. O peregrino alterna voo batido com deslizes mais contidos, recolhendo os punhos e mantendo a cauda estreita.',
    reference: 'https://www.allaboutbirds.org/guide/Peregrine_Falcon/id',
    create: createFalcon,
    transform: transformFalcon,
    flight: falconPose,
    framing: { width: 6.0, height: 4.7, profileHeight: 5.3 },
    studies: [
      {
        name: 'Deslizar',
        detail: 'ASAS AFILADAS',
        view: 'ventral',
        pose: { yaw: -0.22, bank: 0, lift: -0.025, tip: 0, elbow: 0, fold: 0.19 },
      },
      {
        name: 'Virar',
        detail: '35°',
        view: 'oblique',
        pose: { yaw: 0.1, bank: 0.61, lift: 0.02, tip: 0, elbow: 0, fold: 0.16 },
      },
      {
        name: 'Recuperar',
        detail: 'PUNHOS FLEXIONADOS',
        view: 'oblique',
        pose: { yaw: -0.2, bank: 0, lift: 0.72, tip: -0.16, elbow: -0.1, fold: 0.3 },
      },
      {
        name: 'Compactar',
        detail: 'ASAS RECOLHIDAS',
        view: 'oblique',
        pose: {
          yaw: -0.15,
          bank: 0.08,
          lift: 0.03,
          tip: 0.05,
          elbow: 0.08,
          fold: 0.62,
          tailSpread: 0.65,
        },
      },
    ],
  },
];
export function getSpecies(id: SpeciesId): Species {
  const result = SPECIES.find((species) => species.id === id);
  if (!result) throw new RangeError(`Invalid species: ${id}`);
  return result;
}
