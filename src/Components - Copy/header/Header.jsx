import React from 'react'

const Header = ({data}) => {
  return (
    <div className='p-2 text-white flex flex-wrap gap-4 text-sm'>
      <span className='truncate max-w-[180px] cursor-pointer' title={data.centerName}>
        Center Name: {data.centerName}
      </span>
      <span className='truncate max-w-[180px] cursor-pointer' title={data.centerAddress}>
        Center Address: {data.centerAddress}
      </span>
      <span className='truncate max-w-[120px] cursor-pointer' title={data.hostname}>
        Host Name: {data.hostname}
      </span>
      <span className='truncate max-w-[full] cursor-pointer' title={data.macAddress}>
        Mac Address: {data.macAddress}
      </span>
      <span className='truncate max-w-[150px] cursor-pointer' title={data.pcName}>
        Pc Name: {data.pcName}
      </span>
      <span className='truncate max-w-[150px] cursor-pointer' title={data.platform}>
        Platform: {data.platform}
      </span>
    </div>
  )
}

export default Header
