export interface Pega {
  id: number;
  url: string;
  titulo: string;
  empleador: string;
  descripcion: string;
  categoria: string;
  ubicacion: string;
  sueldo: string | null;
  tags: string | null;
  fecha_publicacion: string | null;
  fuente: string;
  fecha_creacion: string;
}

export interface PegasData {
  total: number;
  fuentes: string[];
  categorias: string[];
  actualizado: string;
  pegas: Pega[];
}
