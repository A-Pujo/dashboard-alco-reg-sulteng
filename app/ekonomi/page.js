'use client'

import React, { useState, useEffect, useCallback } from 'react';
import ModalFilter from '../components/ModalFilter'; // Sesuaikan path jika berbeda
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Info, CalendarDays, Filter, Search, Variable } from 'lucide-react'; // Contoh ikon dari lucide-react
import { formatLargeNumber } from '../lib/formatLargeNumber';
import Select from 'react-select'


export default function DashboardEkonomi() {
  const BPSKey = process.env.NEXT_PUBLIC_BPS_KEY
  const [domainList, setDomainList] = useState([])
  const [selectedDomain, setSelectedDomain] = useState(null)
  const [variableList, setVariableList] = useState([])
  const [selectedVariable, setSelectedVariable] = useState(null)
  const [fetchedData, setFetchedData] = useState(null) 
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)

  const BPSFetchAllDomain = async () => {
    setIsLoading(true)
    await fetch(`https://webapi.bps.go.id/v1/api/domain/type/all/key/${BPSKey}`).then((response) => response.json()).then((res) => {
      let filteredRes = res.data[1].filter(item => {
        return item.domain_id && item.domain_id.startsWith('72')
      })

      filteredRes = [...filteredRes, { domain_id: '0000', domain_name: 'Nasional' }]
      let filteredResTransformed = filteredRes.map((item) => ({
        value: item.domain_id,
        label: item.domain_name
      }))
      // console.log(filteredResTransformed)
      setDomainList(filteredResTransformed)
    }).catch((error) => {
      console.warn(error)
    }).finally(() => {
      setIsLoading(false)
    })
  }

  const BPSFetchAllVariable = async () => {
    setIsLoading(true)
    if(!selectedDomain) {
      return 
    }

    let pageCount =  await fetch(`https://webapi.bps.go.id/v1/api/list/model/var/domain/${selectedDomain}/key/${BPSKey}`).then((response) => response.json()).then((res) => {
      return res.data[0].pages
    }).catch((error) => {
      console.warn(error)
    })

    let variableListTemp = []
    
    for (let page = 1; page <= pageCount; page++) {
      let variableOnPage = await fetch(`https://webapi.bps.go.id/v1/api/list/model/var/domain/${selectedDomain}/page/${page}/key/${BPSKey}`).then((response) => response.json()).then((res) => {
        return res.data[1]
      }).catch((error) => {
        console.warn(error)
      })
      variableListTemp = [...variableListTemp, ...variableOnPage]
    }

    let variableListTransformed = variableListTemp.map((item) => ({
      value: item.var_id,
      label: item.title
    }))
    // console.log(variableListTransformed)
    setVariableList(variableListTransformed)
    setIsLoading(false)
  }

  const fetchVariableData = async () => {
    setIsFetching(true)
    if(!selectedVariable) {
      return
    }

    const pageThCount = await fetch(`https://webapi.bps.go.id/v1/api/list/model/th/domain/${selectedDomain}/var/${selectedVariable}/key/${BPSKey}`).then((response) => response.json()).then((res) => {
      return res.data[0].pages
    })

    let tahunList = []
    
    for (let page = 1; page <= pageThCount; page++) {
      let thOnPage = await fetch(`https://webapi.bps.go.id/v1/api/list/model/th/domain/${selectedDomain}/var/${selectedVariable}/page/${page}/key/${BPSKey}`).then((response) => response.json()).then((res) => {
        return res.data[1]
      })
      
      tahunList = [...tahunList, ...thOnPage]
    }

    let combinedData = {
        var: null,
        turvar: null,
        vervar: null,
        tahun: [],
        turtahun: null,
        datacontent: {}
    }
    let allTahunObjects = []
    let uniqueTurtahun = new Set()

    try {
      const fetchPromises = tahunList.map(async (yearInfo) => {
        const result = await fetch(`https://webapi.bps.go.id/v1/api/list/model/data/lang/ind/domain/${selectedDomain}/var/${selectedVariable}/th/${yearInfo.th_id}/key/${BPSKey}`).then((response) => response.json())
        if (result.status === 'OK' && result.datacontent) {
          return result
        }
        console.warn(`No data or API error for year ${yearInfo.th_name}. Response:`, data)
        return null
      })

      const responsesForYears = await Promise.all(fetchPromises)

      responsesForYears.forEach(dataForYear => {
        // console.log(dataForYear)
        if(dataForYear) {
          if(!combinedData.var) combinedData.var = dataForYear.var
          if(!combinedData.turvar) combinedData.turvar = dataForYear.turvar
          if(!combinedData.vervar) combinedData.vervar = dataForYear.vervar
          if(!combinedData.turtahun) combinedData.turtahun = dataForYear.turtahun

          combinedData.datacontent = {...combinedData.datacontent, ...dataForYear.datacontent}

          if (dataForYear.tahun) {
            allTahunObjects = allTahunObjects.concat(dataForYear.tahun)
          }

          if (dataForYear.turtahun) {
              dataForYear.turtahun.forEach(tt => uniqueTurtahun.add(JSON.stringify(tt)))
          }
        }
      })

      combinedData.tahun = allTahunObjects.sort((a, b) => parseInt(a.val) - parseInt(b.val))
      combinedData.turtahun = Array.from(uniqueTurtahun).map(tt => JSON.parse(tt))
      // console.log(combinedData)
      setFetchedData(combinedData)

    } catch (error) {
      console.warn(error)
    } finally {
      setIsFetching(false)
    }
  }

  useEffect(() => {
    BPSFetchAllDomain()
  }, [])

  useEffect(() => {
    if(selectedDomain){
      BPSFetchAllVariable()
    }
  }, [selectedDomain])

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-12">
      <div className='flex border-b border-gray-300 py-2 mb-4'>
        <h2 className='flex-1 text-xl font-bold'>Kinerja Ekonomi <sup className='text-xs font-light'>BPS Table</sup></h2>
      </div>

      <section>
        <div className='join w-full mb-4'>
          <Select
            className="join-item basic-single text-sm w-2/5"
            isDisabled={domainList.length === 0 || isLoading}
            isLoading={isLoading}
            isClearable={false}
            isSearchable={true}
            options={domainList}
            onChange={(e) => {
              setSelectedDomain(e.value)
            }}
          />

          <Select
            className="join-item basic-single text-sm w-3/5"
            isDisabled={variableList.length === 0 || isLoading}
            isLoading={isLoading}
            isClearable={false}
            isSearchable={true}
            options={variableList}
            onChange={(e) => {
              setSelectedVariable(e.value)
            }}
          />

          <button className='btn btn-sm h-auto btn-outline btn-primary rounded-r-lg' onClick={fetchVariableData} disabled={!selectedVariable || isLoading}><Search className='w-4 h-4'/></button>
        </div>

        {!isFetching ? (
          <div className='grid grid-cols-1'>
            <div className="overflow-x-auto bg-white">
              {fetchedData && (
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th rowSpan={2}>Komponen</th>
                      <th rowSpan={2}>Turunan</th>
                      {fetchedData.tahun.map((th, index) => {
                        return <th key={index} className='text-center' colSpan={fetchedData.turtahun.length}>{th.label}</th>
                      })}
                    </tr>
                    <tr>
                    {fetchedData.tahun.map((th, i) => {
                      let elements = fetchedData.turtahun.map((turth, j) => (
                        <th key={`${i}${j}`} colSpan={1}>{turth.label}</th>
                      ))
                      return elements
                    })}
                    </tr>
                  </thead>
                  <tbody>
                    {fetchedData.vervar.map((vervar, i) => (
                      fetchedData.turvar.map((turvar, j) => (
                        <tr key={`${i}-${j}`}>
                          <td rowSpan={1}>{vervar.label}</td>
                          <td rowSpan={1}>{turvar.val === 0 ? "" : turvar.label}</td>
                          {
                            fetchedData.tahun.map((tahun, k) =>
                              fetchedData.turtahun.map((turtahun, l) => (
                                <td key={`${vervar.val}${selectedVariable}${turvar.val}${tahun.val}${turtahun.val}`}>
                                  {fetchedData.datacontent[`${vervar.val}${selectedVariable}${turvar.val}${tahun.val}${turtahun.val}`]}
                                </td>
                              ))
                            )
                          }
                        </tr>
                      ))
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          ) : (
          <div className="flex justify-center items-center skeleton h-32 w-full">
            <h1>Loading...</h1>
          </div>
        )}
      </section>
        
    </main>
  );
}