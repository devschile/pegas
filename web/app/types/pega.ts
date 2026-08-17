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

export interface PegasListado {
  total: number;
  pagina: number;
  porPagina: number;
  pegas: Pega[];
}

export interface PegasMeta {
  total: number;
  categorias: string[];
  fuentes: string[];
  actualizado: string | null;
}
