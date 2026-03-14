'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  Scale, RefreshCw, Printer, Eye, Plus, Save, CheckCircle, AlertCircle,
  Beef, Edit, Trash2, ArrowRight, X, Minus, AlertTriangle, ClipboardCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

const TIPOS_ANIMALES: Record<string, { codigo: string; label: string }[]> = {
  BOVINO: [
    { codigo: 'TO', label: 'Toro' },
    { codigo: 'VA', label: 'Vaca' },
    { codigo: 'VQ', label: 'Vaquillona' },
    { codigo: 'MEJ', label: 'Torito/Mej' },
    { codigo: 'NO', label: 'Novillo' },
    { codigo: 'NT', label: 'Novillito' },
  ],
  EQUINO: [
    { codigo: 'PADRILLO', label: 'Padrillo' },
    { codigo: 'POTRILLO', label: 'Potrillo/Potranca' },
    { codigo: 'YEGUA', label: 'Yegua' },
    { codigo: 'CABALLO', label: 'Caballo' },
    { codigo: 'BURRO', label: 'Burro' },
    { codigo: 'MULA', label: 'Mula' },
  ]
}

const RAZAS_BOVINO = [
  'Angus', 'Hereford', 'Braford', 'Brangus', 'Charolais', 'Limousin',
  'Santa Gertrudis', 'Nelore', 'Brahman', 'Cebú', 'Cruza', 'Otro'
]

const RAZAS_EQUINO = [
  'Criollo', 'Pura Sangre', 'Cuarto de Milla', 'Percherón', 'Belga',
  'Árabe', 'Silla Argentino', 'Petiso', 'Otro'
]

interface Operador {
  id: string
  nombre: string
}

interface Corral {
  id: string
  nombre: string
  capacidad: number
  stockBovinos: number
  stockEquinos: number
}

interface Tropa {
  id: string
  numero: number
  codigo: string
  especie: string
  cantidadCabezas: number
  estado: string
  corral?: { id: string; nombre: string } | string
  corralId?: string
  pesoNeto?: number
  pesoTotalIndividual?: number
  usuarioFaena?: { nombre: string }
  tiposAnimales?: { tipoAnimal: string; cantidad: number }[]
  observaciones?: string
}

interface Animal {
  id: string
  numero: number
  codigo: string
  tipoAnimal: string
  caravana?: string
  raza?: string
  pesoVivo?: number
  observaciones?: string
  estado: string
}

// Tipo para cantidades validadas/confirmadas
interface TipoCantidadConfirmada {
  tipoAnimal: string
  cantidadDTE: number      // Cantidad original del DTE
  cantidadConfirmada: number // Cantidad validada/ajustada
}

export function PesajeIndividualModule({ tropas: propTropas, operador }: { tropas?: Tropa[]; operador: Operador }) {
  const [tropas, setTropas] = useState<Tropa[]>(propTropas || [])
  const [tropasPorPesar, setTropasPorPesar] = useState<Tropa[]>([])
  const [tropasPesado, setTropasPesado] = useState<Tropa[]>([])
  const [corrales, setCorrales] = useState<Corral[]>([])
  const [loading, setLoading] = useState(!propTropas)
  const [saving, setSaving] = useState(false)
  
  const [activeTab, setActiveTab] = useState('solicitar')
  const [tropaSeleccionada, setTropaSeleccionada] = useState<Tropa | null>(null)
  const [animales, setAnimales] = useState<Animal[]>([])
  const [animalActual, setAnimalActual] = useState(0)
  const [corralDestinoId, setCorralDestinoId] = useState('')
  
  // Form fields
  const [caravana, setCaravana] = useState('')
  const [tipoAnimalSeleccionado, setTipoAnimalSeleccionado] = useState('')
  const [raza, setRaza] = useState('')
  const [pesoActual, setPesoActual] = useState('')
  const [observacionesAnimal, setObservacionesAnimal] = useState('')
  
  // Diálogo de validación
  const [validacionDialogOpen, setValidacionDialogOpen] = useState(false)
  const [tiposConfirmados, setTiposConfirmados] = useState<TipoCantidadConfirmada[]>([])
  const [nuevoTipoSeleccionado, setNuevoTipoSeleccionado] = useState('')
  
  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null)
  const [editCaravana, setEditCaravana] = useState('')
  const [editTipoAnimal, setEditTipoAnimal] = useState('')
  const [editRaza, setEditRaza] = useState('')
  const [editPeso, setEditPeso] = useState('')

  useEffect(() => {
    if (!propTropas) {
      fetchData()
    }
  }, [propTropas])

  useEffect(() => {
    // Simplificar estados: "Por pesar" incluye RECIBIDO, EN_CORRAL, EN_PESAJE
    // "Pesado" es el estado final
    setTropasPorPesar(tropas.filter(t => 
      t.estado === 'EN_PESAJE' || t.estado === 'RECIBIDO' || t.estado === 'EN_CORRAL'
    ))
    setTropasPesado(tropas.filter(t => t.estado === 'PESADO'))
  }, [tropas])

  const fetchData = async () => {
    try {
      const [tropasRes, corralesRes] = await Promise.all([
        fetch('/api/tropas'),
        fetch('/api/corrales')
      ])
      const tropasData = await tropasRes.json()
      const corralesData = await corralesRes.json()
      
      if (tropasData.success) {
        setTropas(tropasData.data)
      }
      if (corralesData.success) {
        setCorrales(corralesData.data)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const razasActuales = tropaSeleccionada?.especie === 'EQUINO' ? RAZAS_EQUINO : RAZAS_BOVINO

  // Tipos de animales disponibles para pesar (solo los confirmados con cantidad > 0)
  const tiposDisponiblesParaPesar = useMemo(() => {
    if (tiposConfirmados.length === 0) return []
    
    const todosTipos = TIPOS_ANIMALES[tropaSeleccionada?.especie || 'BOVINO'] || []
    
    // Filtrar solo los tipos que tienen cantidad confirmada > 0
    return todosTipos.filter(t => {
      const confirmado = tiposConfirmados.find(tc => tc.tipoAnimal === t.codigo)
      return confirmado && confirmado.cantidadConfirmada > 0
    })
  }, [tiposConfirmados, tropaSeleccionada?.especie])

  // Conteo de animales pesados por tipo
  const conteoPesadosPorTipo = useMemo(() => {
    const conteo: Record<string, number> = {}
    animales.filter(a => a.estado === 'PESADO').forEach(a => {
      conteo[a.tipoAnimal] = (conteo[a.tipoAnimal] || 0) + 1
    })
    return conteo
  }, [animales])

  // Verificar si un tipo está disponible para seleccionar
  const isTipoDisponible = (tipoCodigo: string): { disponible: boolean; restantes: number; mensaje: string } => {
    const confirmado = tiposConfirmados.find(tc => tc.tipoAnimal === tipoCodigo)
    if (!confirmado || confirmado.cantidadConfirmada === 0) {
      return { disponible: false, restantes: 0, mensaje: 'No declarado en la tropa' }
    }
    
    const pesados = conteoPesadosPorTipo[tipoCodigo] || 0
    const restantes = confirmado.cantidadConfirmada - pesados
    
    if (restantes <= 0) {
      return { disponible: false, restantes: 0, mensaje: 'Límite alcanzado' }
    }
    
    return { disponible: true, restantes, mensaje: `${restantes} restantes` }
  }

  const handleSeleccionarTropa = async (tropa: Tropa) => {
    // Inicializar tipos confirmados con los datos del DTE
    const tiposIniciales: TipoCantidadConfirmada[] = (tropa.tiposAnimales || []).map(t => ({
      tipoAnimal: t.tipoAnimal,
      cantidadDTE: t.cantidad,
      cantidadConfirmada: t.cantidad
    }))
    setTiposConfirmados(tiposIniciales)
    setConfirmacionCheck(false)
    
    // Fetch animals if already exist
    try {
      const res = await fetch(`/api/tropas/${tropa.id}`)
      const data = await res.json()
      if (data.success && data.data.animales && data.data.animales.length > 0) {
        setAnimales(data.data.animales)
        const pendientes = data.data.animales.filter((a: Animal) => a.estado === 'RECIBIDO')
        setAnimalActual(pendientes.length > 0 ? data.data.animales.findIndex((a: Animal) => a.estado === 'RECIBIDO') : data.data.animales.length)
      } else {
        setAnimales([])
        setAnimalActual(0)
      }
    } catch {
      setAnimales([])
      setAnimalActual(0)
    }
    
    // Set corral destino from tropa if available
    if (tropa.corralId) {
      setCorralDestinoId(tropa.corralId)
    } else if (typeof tropa.corral === 'object' && tropa.corral?.id) {
      setCorralDestinoId(tropa.corral.id)
    } else {
      setCorralDestinoId('')
    }
    
    setTropaSeleccionada(tropa)
    resetFormFields()
    
    // Abrir diálogo de validación
    setValidacionDialogOpen(true)
  }

  const resetFormFields = () => {
    setCaravana('')
    setTipoAnimalSeleccionado('')
    setRaza('')
    setPesoActual('')
    setObservacionesAnimal('')
  }

  // Función para ajustar cantidad confirmada
  const ajustarCantidadConfirmada = (tipoAnimal: string, delta: number) => {
    setTiposConfirmados(prev => prev.map(tc => {
      if (tc.tipoAnimal === tipoAnimal) {
        const nuevaCantidad = Math.max(0, tc.cantidadConfirmada + delta)
        return { ...tc, cantidadConfirmada: nuevaCantidad }
      }
      return tc
    }))
  }

  const setCantidadConfirmada = (tipoAnimal: string, cantidad: number) => {
    setTiposConfirmados(prev => prev.map(tc => {
      if (tc.tipoAnimal === tipoAnimal) {
        return { ...tc, cantidadConfirmada: Math.max(0, cantidad) }
      }
      return tc
    }))
  }

  // Total de animales confirmados
  const totalConfirmados = tiposConfirmados.reduce((acc, tc) => acc + tc.cantidadConfirmada, 0)
  const totalDTE = tiposConfirmados.reduce((acc, tc) => acc + tc.cantidadDTE, 0)

  // Función para agregar un nuevo tipo de animal no declarado en el DTE
  const agregarNuevoTipo = () => {
    if (!nuevoTipoSeleccionado) return
    
    // Verificar si ya existe
    if (tiposConfirmados.some(tc => tc.tipoAnimal === nuevoTipoSeleccionado)) {
      toast.error('Este tipo de animal ya está en la lista')
      return
    }
    
    // Agregar nuevo tipo con cantidadDTE = 0 (no estaba en el DTE)
    setTiposConfirmados(prev => [...prev, {
      tipoAnimal: nuevoTipoSeleccionado,
      cantidadDTE: 0,
      cantidadConfirmada: 1
    }])
    setNuevoTipoSeleccionado('')
    toast.success('Tipo agregado correctamente')
  }
  
  // Función para eliminar un tipo de animal
  const eliminarTipo = (tipoAnimal: string) => {
    setTiposConfirmados(prev => prev.filter(tc => tc.tipoAnimal !== tipoAnimal))
  }

  const handleConfirmarValidacion = async () => {
    if (totalConfirmados === 0) {
      toast.error('Debe haber al menos un animal confirmado')
      return
    }
    
    if (!corralDestinoId) {
      toast.error('Seleccione el corral de destino')
      return
    }
    
    setValidacionDialogOpen(false)
    
    // Si las cantidades cambiaron, actualizar en la base de datos
    if (totalConfirmados !== totalDTE || tiposConfirmados.some(tc => tc.cantidadConfirmada !== tc.cantidadDTE)) {
      try {
        await fetch('/api/tropas', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: tropaSeleccionada?.id,
            cantidadCabezas: totalConfirmados,
            tiposAnimales: tiposConfirmados.map(tc => ({
              tipoAnimal: tc.tipoAnimal,
              cantidad: tc.cantidadConfirmada
            }))
          })
        })
        toast.success('Cantidades actualizadas según lo recibido')
      } catch {
        toast.error('Error al actualizar cantidades')
      }
    }
    
    handleIniciarPesaje()
  }

  const handleIniciarPesaje = async () => {
    if (!tropaSeleccionada) return
    if (!corralDestinoId) {
      toast.error('Seleccione el corral de destino')
      return
    }
    
    setSaving(true)
    try {
      // Actualizar estado de la tropa a EN_PESAJE y asignar corral
      const res = await fetch('/api/tropas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tropaSeleccionada.id,
          estado: 'EN_PESAJE',
          corralId: corralDestinoId
        })
      })
      
      if (res.ok) {
        toast.success('Pesaje iniciado')
        setActiveTab('pesar')
        
        // Create animals list based on tiposConfirmados (no tiposAnimales originales)
        if (animales.length === 0) {
          const nuevosAnimales: Animal[] = []
          let num = 1
          const prefijo = tropaSeleccionada.especie === 'BOVINO' ? 'B' : 'E'
          const year = new Date().getFullYear()
          
          for (const tipo of tiposConfirmados) {
            for (let i = 0; i < tipo.cantidadConfirmada; i++) {
              nuevosAnimales.push({
                id: `temp-${num}`,
                numero: num,
                codigo: `${prefijo}${year}${String(tropaSeleccionada.numero).padStart(4, '0')}-${String(num).padStart(3, '0')}`,
                tipoAnimal: tipo.tipoAnimal,
                estado: 'RECIBIDO'
              })
              num++
            }
          }
          
          setAnimales(nuevosAnimales)
          setAnimalActual(0)
        }
        
        fetchData()
      } else {
        toast.error('Error al iniciar pesaje')
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleRegistrarPeso = async () => {
    if (!pesoActual || !animales[animalActual]) return
    
    const peso = parseFloat(pesoActual)
    if (isNaN(peso) || peso <= 0) {
      toast.error('Ingrese un peso válido')
      return
    }

    if (!tipoAnimalSeleccionado) {
      toast.error('Seleccione el tipo de animal')
      return
    }

    // Validar que el tipo esté disponible y no exceda el límite
    const tipoDisponible = isTipoDisponible(tipoAnimalSeleccionado)
    if (!tipoDisponible.disponible) {
      toast.error(`No puede asignar más animales de tipo ${tipoAnimalSeleccionado}: ${tipoDisponible.mensaje}`)
      return
    }

    setSaving(true)
    try {
      const animal = animales[animalActual]
      
      // Crear/actualizar animal en la base de datos
      const res = await fetch('/api/animales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tropaId: tropaSeleccionada?.id,
          numero: animal.numero,
          codigo: animal.codigo,
          tipoAnimal: tipoAnimalSeleccionado,
          caravana: caravana || null,
          raza: raza || null,
          pesoVivo: peso,
          observaciones: observacionesAnimal || null,
          operadorId: operador.id
        })
      })
      
      if (res.ok) {
        const newAnimal = await res.json()
        
        // Actualizar animal en la lista local
        const animalesActualizados = [...animales]
        animalesActualizados[animalActual] = {
          ...animalesActualizados[animalActual],
          id: newAnimal.id,
          caravana: caravana || undefined,
          raza: raza || undefined,
          tipoAnimal: tipoAnimalSeleccionado,
          pesoVivo: peso,
          observaciones: observacionesAnimal || undefined,
          estado: 'PESADO'
        }
        setAnimales(animalesActualizados)
        
        // Imprimir rótulo
        imprimirRotulo(animalesActualizados[animalActual])
        
        // Avanzar al siguiente animal automáticamente
        const nextIndex = animalesActualizados.findIndex((a, i) => a.estado === 'RECIBIDO' && i > animalActual)
        if (nextIndex !== -1) {
          setAnimalActual(nextIndex)
          resetFormFields()
          toast.success(`Animal ${animal.numero} registrado - ${peso} kg`, { duration: 1500 })
        } else {
          // Check if all animals are weighed
          const noPesados = animalesActualizados.filter(a => a.estado === 'RECIBIDO')
          if (noPesados.length === 0) {
            toast.success('¡Pesaje completado!')
            handleFinalizarPesaje()
          } else {
            const firstPendiente = animalesActualizados.findIndex(a => a.estado === 'RECIBIDO')
            if (firstPendiente !== -1) {
              setAnimalActual(firstPendiente)
              resetFormFields()
            }
          }
        }
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || 'Error al registrar peso')
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleFinalizarPesaje = async () => {
    if (!tropaSeleccionada) return
    
    setSaving(true)
    try {
      // Calcular peso total
      const pesoTotal = animales.reduce((acc, a) => acc + (a.pesoVivo || 0), 0)
      
      // Actualizar estado de la tropa a PESADO
      const res = await fetch('/api/tropas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tropaSeleccionada.id,
          estado: 'PESADO',
          pesoTotalIndividual: pesoTotal
        })
      })
      
      const data = await res.json()
      
      if (res.ok && data.success) {
        toast.success('Tropa pesada completamente')
        setTropaSeleccionada(null)
        setAnimales([])
        setAnimalActual(0)
        setTiposConfirmados([])
        setActiveTab('solicitar')
        await fetchData()
      } else {
        toast.error(data.error || 'Error al finalizar pesaje')
      }
    } catch (error) {
      console.error('Error al finalizar pesaje:', error)
      toast.error('Error de conexión al finalizar pesaje')
    } finally {
      setSaving(false)
    }
  }

  const imprimirRotulo = (animal: Animal) => {
    const printWindow = window.open('', '_blank', 'width=300,height=400')
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Rótulo ${animal.codigo}</title>
          <style>
            @page { size: 10cm 10cm; margin: 0; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 5mm; 
              width: 10cm;
              height: 10cm;
              box-sizing: border-box;
            }
            .rotulo {
              border: 4px solid black;
              padding: 4mm;
              height: 100%;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid black;
              padding-bottom: 3mm;
              margin-bottom: 3mm;
            }
            .empresa {
              font-size: 12px;
              font-weight: bold;
            }
            .dato {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 2mm 0;
              border-bottom: 1px dashed #ccc;
            }
            .label { font-weight: bold; font-size: 14px; }
            .valor { font-size: 18px; font-weight: bold; }
            .peso-destacado { 
              font-size: 32px; 
              font-weight: bold; 
              text-align: center;
              margin: 4mm 0;
              padding: 4mm;
              background: #000;
              color: #fff;
              border-radius: 5px;
            }
            .barcode {
              text-align: center;
              margin-top: auto;
              font-family: 'Libre Barcode 39', cursive;
              font-size: 28px;
            }
          </style>
        </head>
        <body>
          <div class="rotulo">
            <div class="header">
              <div class="empresa">SOLEMAR ALIMENTARIA</div>
            </div>
            
            <div class="dato">
              <span class="label">TROPA:</span>
              <span class="valor">${tropaSeleccionada?.codigo || ''}</span>
            </div>
            
            <div class="dato">
              <span class="label">ANIMAL Nº:</span>
              <span class="valor">${animal.numero}</span>
            </div>
            
            <div class="dato">
              <span class="label">FECHA:</span>
              <span class="valor">${new Date().toLocaleDateString('es-AR')}</span>
            </div>
            
            <div class="peso-destacado">
              ${animal.pesoVivo?.toLocaleString()} KG
            </div>
            
            <div class="barcode">
              *${animal.codigo}*
            </div>
          </div>
          
          <script>
            window.onload = function() { 
              window.print(); 
              window.onafterprint = function() { window.close(); } 
            }
          </script>
        </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  const handleEditAnimal = (animal: Animal) => {
    setEditingAnimal(animal)
    setEditCaravana(animal.caravana || '')
    setEditTipoAnimal(animal.tipoAnimal)
    setEditRaza(animal.raza || '')
    setEditPeso(animal.pesoVivo?.toString() || '')
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingAnimal) return
    
    try {
      const res = await fetch('/api/animales', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAnimal.id,
          caravana: editCaravana || null,
          tipoAnimal: editTipoAnimal,
          raza: editRaza || null,
          pesoVivo: parseFloat(editPeso) || null
        })
      })
      
      if (res.ok) {
        toast.success('Animal actualizado')
        setEditDialogOpen(false)
        
        const updated = animales.map(a => {
          if (a.id === editingAnimal.id) {
            return {
              ...a,
              caravana: editCaravana || undefined,
              tipoAnimal: editTipoAnimal,
              raza: editRaza || undefined,
              pesoVivo: parseFloat(editPeso) || undefined
            }
          }
          return a
        })
        setAnimales(updated)
      } else {
        toast.error('Error al actualizar')
      }
    } catch (error) {
      toast.error('Error de conexión')
    }
  }

  const handleDeleteAnimal = async (animal: Animal) => {
    if (!confirm(`¿Eliminar animal ${animal.numero}?`)) return
    
    try {
      const res = await fetch(`/api/animales?id=${animal.id}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        toast.success('Animal eliminado')
        const updated = animales.filter(a => a.id !== animal.id)
        setAnimales(updated)
        if (animalActual >= updated.length) {
          setAnimalActual(Math.max(0, updated.length - 1))
        }
      } else {
        toast.error('Error al eliminar')
      }
    } catch (error) {
      toast.error('Error de conexión')
    }
  }

  const handleReprint = (animal: Animal) => {
    imprimirRotulo(animal)
    toast.success('Rótulo enviado a impresión')
  }

  const animalesPendientes = animales.filter(a => a.estado === 'RECIBIDO')
  const animalesPesados = animales.filter(a => a.estado === 'PESADO')

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center">
        <Scale className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-stone-800">Pesaje Individual</h2>
            <p className="text-stone-500">Pesaje de animales por tropa con validación de datos</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Beef className="h-4 w-4 mr-2 text-amber-500" />
              {tropasPorPesar.length} por pesar
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="solicitar">Solicitar Tropa</TabsTrigger>
            <TabsTrigger value="pesar" disabled={!tropaSeleccionada}>Pesar Animales</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
          </TabsList>

          {/* SOLICITAR TROPA */}
          <TabsContent value="solicitar" className="space-y-6">
            {/* TROPAS POR PESAR */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-amber-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  Tropas Por Pesar
                </CardTitle>
                <CardDescription>
                  Tropas recibidas pendientes de pesaje individual
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tropasPorPesar.length === 0 ? (
                  <div className="text-center py-8 text-stone-400">
                    <Beef className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No hay tropas pendientes de pesaje</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tropa</TableHead>
                        <TableHead>Usuario Faena</TableHead>
                        <TableHead>Especie</TableHead>
                        <TableHead>Cabezas</TableHead>
                        <TableHead>Corral</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tropasPorPesar.map((tropa) => (
                        <TableRow key={tropa.id} className="hover:bg-stone-50">
                          <TableCell className="font-mono font-bold">{tropa.codigo}</TableCell>
                          <TableCell>{tropa.usuarioFaena?.nombre || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{tropa.especie}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{tropa.cantidadCabezas}</TableCell>
                          <TableCell>{typeof tropa.corral === 'object' ? tropa.corral?.nombre : tropa.corral || '-'}</TableCell>
                          <TableCell>
                            <Button
                              onClick={() => handleSeleccionarTropa(tropa)}
                              className="bg-amber-500 hover:bg-amber-600"
                            >
                              <Scale className="w-4 h-4 mr-2" />
                              Seleccionar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* TROPAS PESADAS */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-green-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Tropas Pesadas
                </CardTitle>
                <CardDescription>
                  Historial de tropas con pesaje completado
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tropasPesado.length === 0 ? (
                  <div className="text-center py-8 text-stone-400">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No hay tropas pesadas</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tropa</TableHead>
                        <TableHead>Usuario Faena</TableHead>
                        <TableHead>Especie</TableHead>
                        <TableHead>Cabezas</TableHead>
                        <TableHead>Peso Total</TableHead>
                        <TableHead>Peso Promedio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tropasPesado.map((tropa) => (
                        <TableRow key={tropa.id} className="hover:bg-stone-50">
                          <TableCell className="font-mono font-bold">{tropa.codigo}</TableCell>
                          <TableCell>{tropa.usuarioFaena?.nombre || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{tropa.especie}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{tropa.cantidadCabezas}</TableCell>
                          <TableCell className="font-bold text-green-600">
                            {tropa.pesoTotalIndividual?.toLocaleString() || '-'} kg
                          </TableCell>
                          <TableCell>
                            {tropa.pesoTotalIndividual && tropa.cantidadCabezas
                              ? Math.round(tropa.pesoTotalIndividual / tropa.cantidadCabezas).toLocaleString() + ' kg/cab'
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PESAR ANIMALES */}
          <TabsContent value="pesar" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Formulario de pesaje */}
              <Card className="lg:col-span-2 border-0 shadow-md">
                <CardHeader className="bg-green-50">
                  <CardTitle className="text-lg">
                    Pesaje - {tropaSeleccionada?.codigo}
                  </CardTitle>
                  <CardDescription>
                    Animal {animalActual + 1} de {animales.length} | {animalesPendientes.length} pendientes
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Barra de progreso */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progreso</span>
                      <span>{animalesPesados.length} / {animales.length} pesados</span>
                    </div>
                    <div className="h-4 bg-stone-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${(animalesPesados.length / animales.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Resumen de tipos confirmados */}
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-800 mb-2">Tipos confirmados para esta tropa:</p>
                    <div className="flex flex-wrap gap-2">
                      {tiposConfirmados.filter(tc => tc.cantidadConfirmada > 0).map(tc => {
                        const pesados = conteoPesadosPorTipo[tc.tipoAnimal] || 0
                        const restantes = tc.cantidadConfirmada - pesados
                        const tipoInfo = TIPOS_ANIMALES[tropaSeleccionada?.especie || 'BOVINO']?.find(t => t.codigo === tc.tipoAnimal)
                        return (
                          <Badge key={tc.tipoAnimal} variant={restantes > 0 ? "default" : "outline"} 
                            className={restantes > 0 ? "bg-blue-600" : "bg-gray-400"}>
                            {tc.tipoAnimal}: {pesados}/{tc.cantidadConfirmada} {restantes > 0 && `(${restantes} rest.)`}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>

                  {/* Datos del animal actual */}
                  {animales[animalActual] && (
                    <div className="space-y-4">
                      <div className="bg-stone-50 p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-stone-500">Nº de Animal</p>
                            <p className="text-2xl font-bold">{animales[animalActual].numero}</p>
                          </div>
                          <div>
                            <p className="text-sm text-stone-500">Código</p>
                            <p className="text-lg font-mono">{animales[animalActual].codigo}</p>
                          </div>
                        </div>
                      </div>

                      {/* Campos de identificación */}
                      <div className="space-y-4">
                        {/* Caravana y Peso */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Caravana (opcional)</Label>
                            <Input
                              value={caravana}
                              onChange={(e) => setCaravana(e.target.value.toUpperCase())}
                              placeholder="Nº caravana"
                              className="font-mono text-lg h-12"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Peso (kg) *</Label>
                            <Input
                              type="number"
                              value={pesoActual}
                              onChange={(e) => setPesoActual(e.target.value)}
                              className="text-2xl font-bold text-center h-12"
                              placeholder="0"
                              autoFocus
                            />
                          </div>
                        </div>

                        {/* Tipo de Animal - Solo los confirmados */}
                        <div className="space-y-2">
                          <Label className="text-base font-semibold">Tipo de Animal *</Label>
                          <p className="text-xs text-stone-500 mb-2">
                            Solo se muestran los tipos declarados con cantidad disponible
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {tiposDisponiblesParaPesar.map((t) => {
                              const tipoStatus = isTipoDisponible(t.codigo)
                              const isSelected = tipoAnimalSeleccionado === t.codigo
                              return (
                                <button
                                  key={t.codigo}
                                  type="button"
                                  onClick={() => {
                                    if (tipoStatus.disponible) {
                                      setTipoAnimalSeleccionado(t.codigo)
                                    }
                                  }}
                                  disabled={!tipoStatus.disponible}
                                  className={`px-4 py-3 rounded-lg border-2 font-bold text-lg transition-all ${
                                    isSelected 
                                      ? 'bg-amber-500 text-white border-amber-600 shadow-md' 
                                      : tipoStatus.disponible
                                        ? 'bg-white border-gray-200 hover:border-amber-300 hover:bg-amber-50'
                                        : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                  }`}
                                >
                                  <span>{t.codigo}</span>
                                  {tipoStatus.disponible && (
                                    <span className="text-xs ml-1 block font-normal">({tipoStatus.restantes})</span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                          {tiposDisponiblesParaPesar.length === 0 && (
                            <p className="text-sm text-red-600 font-medium">
                              ⚠️ No hay tipos disponibles - verifique la configuración de la tropa
                            </p>
                          )}
                          {tipoAnimalSeleccionado && (
                            <p className="text-sm text-stone-500 mt-1">
                              Seleccionado: {TIPOS_ANIMALES[tropaSeleccionada?.especie || 'BOVINO']?.find(t => t.codigo === tipoAnimalSeleccionado)?.label}
                              {' '} - {isTipoDisponible(tipoAnimalSeleccionado).mensaje}
                            </p>
                          )}
                        </div>

                        {/* Raza - Dropdown */}
                        <div className="space-y-2">
                          <Label>Raza (opcional)</Label>
                          <Select value={raza} onValueChange={setRaza}>
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Seleccionar raza..." />
                            </SelectTrigger>
                            <SelectContent>
                              {razasActuales.map((r) => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Observaciones */}
                        <div className="space-y-2">
                          <Label>Observaciones</Label>
                          <Textarea
                            value={observacionesAnimal}
                            onChange={(e) => setObservacionesAnimal(e.target.value)}
                            placeholder="Notas adicionales del animal..."
                            rows={2}
                          />
                        </div>
                      </div>

                      {/* Botón de registro */}
                      <Button
                        onClick={handleRegistrarPeso}
                        disabled={saving || !pesoActual || !tipoAnimalSeleccionado}
                        className="w-full h-16 text-xl bg-green-600 hover:bg-green-700"
                      >
                        {saving ? (
                          <>Guardando...</>
                        ) : (
                          <>
                            <Scale className="w-6 h-6 mr-2" />
                            Registrar e Imprimir <ArrowRight className="w-5 h-5 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Navegación entre animales */}
                  <div className="flex gap-2 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setAnimalActual(Math.max(0, animalActual - 1))}
                      disabled={animalActual === 0}
                      className="flex-1"
                    >
                      ← Anterior
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setAnimalActual(Math.min(animales.length - 1, animalActual + 1))}
                      disabled={animalActual >= animales.length - 1}
                      className="flex-1"
                    >
                      Siguiente →
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Lista de animales */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Lista de Animales</CardTitle>
                  <CardDescription>
                    {animalesPesados.length} pesados, {animalesPendientes.length} pendientes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[500px] overflow-y-auto space-y-1">
                    {animales.map((animal, idx) => (
                      <div
                        key={animal.id}
                        className={`p-2 rounded text-sm flex items-center justify-between ${
                          idx === animalActual 
                            ? 'bg-amber-100 border-amber-300 border' 
                            : 'hover:bg-stone-50'
                        }`}
                      >
                        <button
                          onClick={() => setAnimalActual(idx)}
                          className="flex items-center gap-2 flex-1 text-left"
                        >
                          {animal.estado === 'PESADO' ? (
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          )}
                          <span className="font-medium">#{animal.numero}</span>
                          <Badge variant="outline" className="text-xs">{animal.tipoAnimal}</Badge>
                          {animal.caravana && (
                            <span className="text-xs text-stone-400">({animal.caravana})</span>
                          )}
                          {animal.pesoVivo && (
                            <span className="font-medium text-green-600 ml-auto mr-2">{animal.pesoVivo.toLocaleString()} kg</span>
                          )}
                        </button>
                        
                        {/* Acciones */}
                        {animal.estado === 'PESADO' && animal.id && !animal.id.startsWith('temp-') && (
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditAnimal(animal); }}
                              className="p-1 rounded hover:bg-stone-200 text-stone-500 hover:text-blue-600"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleReprint(animal); }}
                              className="p-1 rounded hover:bg-stone-200 text-stone-500 hover:text-green-600"
                              title="Reimprimir"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteAnimal(animal); }}
                              className="p-1 rounded hover:bg-stone-200 text-stone-500 hover:text-red-600"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Total */}
                  <div className="border-t mt-4 pt-4">
                    <div className="flex justify-between font-medium">
                      <span>Total Pesado:</span>
                      <span className="text-green-600">
                        {animalesPesados.reduce((acc, a) => acc + (a.pesoVivo || 0), 0).toLocaleString()} kg
                      </span>
                    </div>
                    {animalesPesados.length > 0 && (
                      <div className="flex justify-between text-sm text-stone-500">
                        <span>Promedio:</span>
                        <span>
                          {Math.round(animalesPesados.reduce((acc, a) => acc + (a.pesoVivo || 0), 0) / animalesPesados.length).toLocaleString()} kg/cab
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* HISTORIAL */}
          <TabsContent value="historial">
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-green-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Tropas Pesadas
                </CardTitle>
                <CardDescription>Historial de tropas con pesaje individual completado</CardDescription>
              </CardHeader>
              <CardContent>
                {tropasPesado.length === 0 ? (
                  <div className="text-center py-8 text-stone-400">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No hay tropas pesadas</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tropa</TableHead>
                        <TableHead>Usuario Faena</TableHead>
                        <TableHead>Especie</TableHead>
                        <TableHead>Cabezas</TableHead>
                        <TableHead>Peso Total</TableHead>
                        <TableHead>Promedio</TableHead>
                        <TableHead>Tipos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tropasPesado.map((tropa) => (
                        <TableRow key={tropa.id}>
                          <TableCell className="font-mono font-bold">{tropa.codigo}</TableCell>
                          <TableCell>{tropa.usuarioFaena?.nombre || '-'}</TableCell>
                          <TableCell><Badge variant="outline">{tropa.especie}</Badge></TableCell>
                          <TableCell>{tropa.cantidadCabezas}</TableCell>
                          <TableCell className="font-bold text-green-600">
                            {tropa.pesoTotalIndividual?.toLocaleString() || '-'} kg
                          </TableCell>
                          <TableCell>
                            {tropa.pesoTotalIndividual && tropa.cantidadCabezas
                              ? Math.round(tropa.pesoTotalIndividual / tropa.cantidadCabezas).toLocaleString() + ' kg'
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {tropa.tiposAnimales?.map((t, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {t.tipoAnimal}: {t.cantidad}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* DIÁLOGO DE VALIDACIÓN */}
      <Dialog open={validacionDialogOpen} onOpenChange={setValidacionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ClipboardCheck className="w-6 h-6 text-amber-600" />
              Validar Datos de la Tropa
            </DialogTitle>
            <DialogDescription>
              Verifique que los tipos y cantidades coincidan con el DTE antes de iniciar el pesaje
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Info de la tropa */}
            <div className="bg-stone-50 p-4 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-stone-500">Tropa</p>
                  <p className="font-mono font-bold text-lg">{tropaSeleccionada?.codigo}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500">Usuario Faena</p>
                  <p className="font-medium">{tropaSeleccionada?.usuarioFaena?.nombre}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500">Especie</p>
                  <Badge variant="outline">{tropaSeleccionada?.especie}</Badge>
                </div>
              </div>
            </div>

            {/* Tabla de validación */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-stone-100">
                    <TableHead className="font-semibold">Tipo</TableHead>
                    <TableHead className="font-semibold text-center">DTE</TableHead>
                    <TableHead className="font-semibold text-center">Recibido</TableHead>
                    <TableHead className="font-semibold text-center w-32">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiposConfirmados.map((tc) => {
                    const tipoInfo = TIPOS_ANIMALES[tropaSeleccionada?.especie || 'BOVINO']?.find(t => t.codigo === tc.tipoAnimal)
                    const diferencia = tc.cantidadConfirmada - tc.cantidadDTE
                    const esNuevo = tc.cantidadDTE === 0 // Tipo agregado manualmente
                    return (
                      <TableRow key={tc.tipoAnimal} className={esNuevo ? 'bg-blue-50' : diferencia !== 0 ? 'bg-amber-50' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{tc.tipoAnimal}</span>
                            <span className="text-xs text-stone-500">({tipoInfo?.label})</span>
                            {esNuevo && (
                              <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">NUEVO</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-lg">
                          {tc.cantidadDTE}
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            value={tc.cantidadConfirmada}
                            onChange={(e) => setCantidadConfirmada(tc.tipoAnimal, parseInt(e.target.value) || 0)}
                            className={`w-20 text-center font-bold text-lg mx-auto ${
                              esNuevo ? 'border-blue-400 bg-blue-50' : diferencia !== 0 ? 'border-amber-400 bg-amber-50' : ''
                            }`}
                            min="0"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => ajustarCantidadConfirmada(tc.tipoAnimal, -1)}
                              disabled={tc.cantidadConfirmada <= 0}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => ajustarCantidadConfirmada(tc.tipoAnimal, 1)}
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                            {esNuevo && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => eliminarTipo(tc.tipoAnimal)}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                title="Eliminar tipo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          {!esNuevo && diferencia !== 0 && (
                            <span className={`text-xs ${diferencia > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                              {diferencia > 0 ? `+${diferencia}` : diferencia}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Totales */}
            <div className="flex justify-between items-center p-4 bg-stone-50 rounded-lg">
              <div>
                <p className="text-sm text-stone-500">Total DTE</p>
                <p className="text-2xl font-bold">{totalDTE}</p>
              </div>
              <ArrowRight className="w-6 h-6 text-stone-400" />
              <div className="text-right">
                <p className="text-sm text-stone-500">Total Confirmado</p>
                <p className={`text-2xl font-bold ${totalConfirmados !== totalDTE ? 'text-amber-600' : 'text-green-600'}`}>
                  {totalConfirmados}
                </p>
              </div>
            </div>

            {/* Alerta si hay diferencias */}
            {totalConfirmados !== totalDTE && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Atención: Diferencia detectada</p>
                  <p className="text-sm text-amber-700">
                    La cantidad confirmada ({totalConfirmados}) difiere del DTE ({totalDTE}).
                    Esta modificación se registrará en el sistema.
                  </p>
                </div>
              </div>
            )}

            {/* Corral de destino */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Corral de Destino *</Label>
              <Select value={corralDestinoId} onValueChange={setCorralDestinoId}>
                <SelectTrigger className="w-full h-12">
                  <SelectValue placeholder="Seleccione el corral donde se ubicarán los animales..." />
                </SelectTrigger>
                <SelectContent>
                  {corrales.map((c) => {
                    const stockActual = tropaSeleccionada?.especie === 'BOVINO' ? c.stockBovinos : c.stockEquinos
                    const disponible = c.capacidad - stockActual
                    return (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre} - Capacidad: {c.capacidad} | Disponible: {disponible}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Agregar tipo de animal no declarado */}
            <div className="space-y-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Label className="text-sm font-semibold text-blue-800">Agregar tipo de animal no declarado en DTE</Label>
              <div className="flex gap-2">
                <Select value={nuevoTipoSeleccionado} onValueChange={setNuevoTipoSeleccionado}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Seleccionar tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_ANIMALES[tropaSeleccionada?.especie || 'BOVINO']
                      ?.filter(t => !tiposConfirmados.some(tc => tc.tipoAnimal === t.codigo))
                      .map(t => (
                        <SelectItem key={t.codigo} value={t.codigo}>
                          {t.codigo} - {t.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={agregarNuevoTipo} 
                  disabled={!nuevoTipoSeleccionado}
                  variant="outline"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar
                </Button>
              </div>
              <p className="text-xs text-blue-600">
                Si vino un tipo de animal no declarado en el DTE, puede agregarlo aquí.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setValidacionDialogOpen(false)
                setTropaSeleccionada(null)
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmarValidacion}
              disabled={totalConfirmados === 0 || !corralDestinoId}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmar e Iniciar Pesaje
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Animal</DialogTitle>
            <DialogDescription>
              Modifique los datos del animal #{editingAnimal?.numero}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Caravana</Label>
              <Input value={editCaravana} onChange={(e) => setEditCaravana(e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Animal</Label>
              <Select value={editTipoAnimal} onValueChange={setEditTipoAnimal}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_ANIMALES[tropaSeleccionada?.especie || 'BOVINO']?.map((t) => (
                    <SelectItem key={t.codigo} value={t.codigo}>{t.codigo} - {t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Raza</Label>
              <Select value={editRaza} onValueChange={setEditRaza}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {razasActuales.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Peso (kg)</Label>
              <Input type="number" value={editPeso} onChange={(e) => setEditPeso(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PesajeIndividualModule
