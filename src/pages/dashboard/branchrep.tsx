import {
  EventsByBranchRepDocument,
  CreateEventDocument,
  DeleteEventDocument,
  SearchUsersDocument,
  AddOrganizerDocument,
  EventType
} from '@/src/generated/generated'
import { useAuth } from '@/src/hooks/useAuth'
import { useMutation, useQuery } from '@apollo/client'
import { useRouter } from 'next/router'
import { useState } from 'react'
import Modal from '@/src/components/modal'
import { NextPage } from 'next'

const BranchRep: NextPage = () => {
  // Get User Data
  const { user, loading, error } = useAuth()

  // Modal State and Handlers
  const [isOpen, setIsOpen] = useState(false)
  const [modalContent, setModalContent] = useState<React.ReactNode | null>(null)

  // Get events of Branch Rep
  const {
    data: events,
    loading: eventsLoading,
    error: eventsError,
    refetch: eventsRefetch
  } = useQuery(EventsByBranchRepDocument, {
    variables: {
      branchRepId: user?.id as string
    }
  })

  const [currentEvent, setCurrentEvent] = useState<number>()

  // Currently searched user
  const [name, setName] = useState<string>('')

  /* Queries */
  // 1. Search Users
  const {
    data: searchUsersData,
    loading: searchUsersLoading,
    error: searchUsersError,
    fetchMore: searchUsersFetchMore
  } = useQuery(SearchUsersDocument, {
    variables: {
      first: 5,
      contains: name
    }
  })

  const { endCursor, hasNextPage } = searchUsersData?.users.pageInfo || {}

  // Infinite Scroll Logic
  function handleScroll (event: React.UIEvent<HTMLDivElement, UIEvent>) {
    const element = event.target as HTMLElement
    if (element?.scrollHeight - element?.scrollTop === element?.clientHeight) {
      searchUsersFetchMore({
        variables: { after: endCursor },
        updateQuery: (prevResult, { fetchMoreResult }) => {
          fetchMoreResult.users.edges = [
            ...prevResult.users.edges,
            ...fetchMoreResult.users.edges
          ]
          return fetchMoreResult
        }
      })
    }
  }

  /* Mutations */
  // 1. Add Event
  const [
    createEventMutation,
    {
      data: createEventData,
      loading: createEventLoading,
      error: createEventError
    }
  ] = useMutation(CreateEventDocument)

  // 2. Delete Event
  const [
    deleteEventMutation,
    {
      data: deleteEventData,
      loading: deleteEventLoading,
      error: deleteEventError
    }
  ] = useMutation(DeleteEventDocument)

  // 3. Add Organizer
  const [
    addOrganizerMutation,
    {
      data: addOrganizerData,
      loading: addOrganizerLoading,
      error: addOrganizerError
    }
  ] = useMutation(AddOrganizerDocument)

  /* Handlers */
  // 1. Add Event Handler
  const handleAddEvent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const target = e.target as typeof e.target & {
      0: { value: string }
      1: { value: EventType }
    }
    const eventName = target[0].value
    const eventType = target[1].value

    createEventMutation({
      variables: {
        eventType: eventType,
        name: eventName
      }
    }).then(() => {
      eventsRefetch()
      handleClose()
    })
  }

  // 2. Delete Event Handler
  const handleDeleteEvent = (id: number) => {
    deleteEventMutation({
      variables: {
        id: id
      }
    }).then(() => {
      eventsRefetch()
      handleClose()
    })
  }

  // 3. Modal Handlers
  const handleOpen = (content: React.ReactNode) => {
    setModalContent(content)
    setIsOpen(true)
  }

  const handleClose = () => {
    setModalContent(null)
    setIsOpen(false)
  }

  // 4. Add Organizer Handler
  const handleAddOrganizer = (id: number, organizerId: string) => {
    addOrganizerMutation({
      variables: {
        eventId: id.toString(),
        userId: organizerId
      }
    }).then(() => {
      eventsRefetch()
    })
  }

  // Get branch name
  const branch = events?.eventsByBranchRep.find(event => event.branch.name)
    ?.branch.name

  // Redirect to profile if not branch rep
  const router = useRouter()
  if (loading) return <div>Loading...</div>
  if (user && user.role !== 'BRANCH_REP') router.push('/profile')
  if (!user) router.push('/')

  return (
    <div className='h-screen w-screen bg-gradient-to-t from-black  to-blue-900 text-gray-100 p-10'>
      {/* Welcome Header */}
      <div className='text-center '>
        <h1 className='text-4xl '>Hello {user?.name}!</h1>
      </div>
      <div>
        <div className='flex items-center justify-center gap-2'>
          <h1 className='text-2xl underline'>Registered Events</h1>
          {branch && <a className='text-xs border rounded-lg px-2'>{branch}</a>}
        </div>
      </div>

      {/* Events */}
      <div className='mt-5 flex flex-col gap-5'>
        {/* Event Header */}
        <div className='bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg bg-clip-padding rounded-lg p-2 flex items-center justify-between gap-5 text-2xl font-bold'>
          <h1>Event Name</h1>
          <h1>Type</h1>
          <h1>Status</h1>
          <h1>Add Organizers</h1>
          <h1>Delete</h1>
        </div>

        {/* Status Updates */}
        {eventsLoading && <div>Loading...</div>}
        {eventsError && <div>Error</div>}
        {events?.eventsByBranchRep.length === 0 && (
          <div className='text-center'>
            <h1>No Events Registered</h1>
          </div>
        )}

        {/* Events list */}
        {events?.eventsByBranchRep.map(event => (
          <div
            key={event.id}
            className='bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg bg-clip-padding rounded-lg p-5 flex items-center justify-between gap-5'
          >
            <h1 className='text-xl'>{event.name}</h1>
            <h1 className='text-xl'>{event.eventType}</h1>
            <h1
              className={`
              text-lg border rounded-lg px-2    w-fit
              ${event.published ? 'text-green-500' : 'text-red-500'}`}
            >
              {event.published ? 'Published' : 'Pending'}
            </h1>
            <button
              className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
              onClick={() => {
                handleOpen('Add Organizers')
                setCurrentEvent(parseInt(event.id))
              }}
            >
              Add Organizers
              <span className='text-xs'>
                {event.organizers.length > 0 && (
                  <span>({event.organizers.length})</span>
                )}
              </span>
            </button>
            <button
              className={`bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded ${
                deleteEventLoading ||
                (event.published &&
                  'bg-red-300 hover:bg-red-300 text-gray-500 cursor-not-allowed')
              }}`}
              onClick={() => {
                handleDeleteEvent(parseInt(event.id))
              }}
              disabled={deleteEventLoading || event.published}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {/* Add Event */}
      <div className='flex items-center justify-center mt-5'>
        <button
          onClick={() => handleOpen('Add Event')}
          className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
        >
          Add Event
        </button>
      </div>

      {/* Modal component 
      1. Add Event
      2. Add Organizers */}
      <Modal isOpen={isOpen} onClose={handleClose}>
        {/* Add Event */}
        {modalContent === 'Add Event' && (
          <div>
            <h1>Add Event</h1>
            {createEventLoading && <div>Loading...</div>}
            {!createEventLoading && (
              <form
                onSubmit={e => {
                  handleAddEvent(e)
                }}
                className='flex flex-col gap-5'
              >
                <input
                  type='text'
                  placeholder='Event Name'
                  className='border-2 border-gray-300 bg-white h-10 px-5 pr-16 rounded-lg text-sm focus:outline-none'
                />
                <select
                  placeholder='Event Type'
                  className='border-2 border-gray-300 bg-white h-10 px-5 pr-16 rounded-lg text-sm focus:outline-none'
                >
                  {Object.keys(EventType).map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <button className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'>
                  Add Event
                </button>
              </form>
            )}
          </div>
        )}

        {/* Add Organizers */}
        {modalContent === 'Add Organizers' && (
          <div>
            <h1>Add Organizers</h1>
            {/* Search for users */}
            <div className='flex gap-5'>
              <input
                type='text'
                placeholder='Search for users'
                className='border-2 border-gray-300 bg-white h-10 px-5 pr-16 rounded-lg text-sm focus:outline-none'
                defaultValue={name}
                onChange={e => {
                  setName(e.target.value)
                }}
              />
            </div>
            {/* List of queried users */}
            <div
              className='mt-5 max-h-40 overflow-y-scroll'
              onScroll={e => {
                handleScroll(e)
              }}
            >
              {searchUsersLoading && <div>Loading...</div>}
              {searchUsersData?.users?.edges.map(user => (
                <div key={user?.node.id} className='border'>
                  <h1 className='text-xl'>{user?.node.name}</h1>
                  <h1 className='text-sm font-thin'>{user?.node.email}</h1>
                  <button
                    className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
                    onClick={() =>
                      handleAddOrganizer(
                        currentEvent as number,
                        user?.node.id as string
                      )
                    }
                  >
                    Add Organizer
                  </button>
                </div>
              ))}
              {!hasNextPage && (
                <p className='my-10 text-center'>No more users to show</p>
              )}
            </div>
            <div>
              {events?.eventsByBranchRep.map(
                event =>
                  parseInt(event.id) === currentEvent && (
                    <div key={event.id}>
                      <h1>{event.name}</h1>
                      {event.organizers.length === 0 && (
                        <div className='text-center'>
                          <h1>No Organizers Added</h1>
                        </div>
                      )}
                      {event.organizers.map(organizer => (
                        <div key={organizer.user.id}>
                          <h1>{organizer.user.name}</h1>
                        </div>
                      ))}
                    </div>
                  )
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default BranchRep
